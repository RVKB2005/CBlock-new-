import authService from "./auth.js";
import blockchainService from "./blockchain.js";

/**
 * Credit Allocation Service
 * Handles automatic credit allocation to document uploaders when documents are minted
 */
class CreditAllocationService {
  constructor() {
    this.allocations = new Map(); // In-memory storage for allocation records
    this.initializeStorage();
  }

  // Initialize storage - load allocations from localStorage
  initializeStorage() {
    try {
      const stored = localStorage.getItem("cblock_credit_allocations");
      if (stored) {
        const allocationsArray = JSON.parse(stored);
        this.allocations = new Map(allocationsArray);
      }
    } catch (error) {
      console.error("Failed to load credit allocations from storage:", error);
      this.allocations = new Map();
    }
  }

  // Save allocations to localStorage
  saveToStorage() {
    try {
      const allocationsArray = Array.from(this.allocations.entries());
      localStorage.setItem(
        "cblock_credit_allocations",
        JSON.stringify(allocationsArray)
      );
    } catch (error) {
      console.error("Failed to save credit allocations to storage:", error);
    }
  }

  /**
   * Process automatic credit allocation after successful minting
   * @param {Object} mintingResult - Result from minting operation
   * @param {Object} documentData - Document information
   * @returns {Promise<Object>} Allocation result
   */
  async processAutomaticAllocation(mintingResult, documentData) {
    try {
      console.log("💰 Processing automatic credit allocation:", {
        documentId: documentData.id,
        recipient: mintingResult.recipient,
        amount: mintingResult.amount,
        transactionHash: mintingResult.hash,
      });

      // Create allocation record
      const allocationId = `alloc_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const allocation = {
        id: allocationId,
        documentId: documentData.id || documentData.cid,
        documentName: documentData.projectName || documentData.filename,
        recipientAddress: mintingResult.recipient,
        recipientName: documentData.uploaderName || "Unknown",
        recipientEmail: documentData.uploaderEmail || null,
        amount: mintingResult.amount,
        tokenId: mintingResult.tokenId,
        transactionHash: mintingResult.hash,
        blockchainReceipt: mintingResult.receipt,

        // Allocation status
        status: "completed", // Since minting was successful, allocation is automatic
        allocatedAt: new Date().toISOString(),

        // Verifier information
        allocatedBy: authService.getCurrentUser()?.walletAddress,
        verifierName: authService.getCurrentUser()?.name,

        // Notification status
        notificationSent: false,
        notificationAttempts: 0,
        lastNotificationAttempt: null,

        // Retry information
        retryCount: 0,
        lastRetryAt: null,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store allocation record
      this.allocations.set(allocationId, allocation);
      this.saveToStorage();

      // Send notification to user
      await this.sendAllocationNotification(allocation);

      console.log("✅ Credit allocation processed successfully:", {
        allocationId,
        recipient: allocation.recipientAddress,
        amount: allocation.amount,
      });

      return {
        success: true,
        allocation,
        message: `Successfully allocated ${
          allocation.amount
        } credits to ${this.formatAddress(allocation.recipientAddress)}`,
      };
    } catch (error) {
      console.error("❌ Failed to process automatic allocation:", error);

      // Create failed allocation record for retry
      const failedAllocationId = `failed_alloc_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const failedAllocation = {
        id: failedAllocationId,
        documentId: documentData.id || documentData.cid,
        documentName: documentData.projectName || documentData.filename,
        recipientAddress: mintingResult.recipient,
        amount: mintingResult.amount,
        transactionHash: mintingResult.hash,
        status: "failed",
        error: error.message,
        createdAt: new Date().toISOString(),
        retryCount: 0,
        needsRetry: true,
      };

      this.allocations.set(failedAllocationId, failedAllocation);
      this.saveToStorage();

      throw new Error(`Credit allocation failed: ${error.message}`);
    }
  }

  /**
   * Send notification to user about credit allocation
   * @param {Object} allocation - Allocation record
   * @returns {Promise<boolean>} Success status
   */
  async sendAllocationNotification(allocation) {
    try {
      console.log("📧 Sending allocation notification:", {
        allocationId: allocation.id,
        recipient: allocation.recipientAddress,
        amount: allocation.amount,
      });

      // Update notification attempt
      allocation.notificationAttempts += 1;
      allocation.lastNotificationAttempt = new Date().toISOString();

      // Use the notification service for consistent notification handling
      const { default: notificationService } = await import(
        "./notificationService.js"
      );

      await notificationService.showCreditAllocationNotification(allocation, {
        showToast: true,
        showBrowserNotification: true,
        priority: "normal",
      });

      // Mark notification as sent
      allocation.notificationSent = true;
      allocation.updatedAt = new Date().toISOString();

      this.allocations.set(allocation.id, allocation);
      this.saveToStorage();

      console.log("✅ Notification sent successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to send notification:", error);

      // Update allocation with notification failure
      allocation.notificationError = error.message;
      allocation.updatedAt = new Date().toISOString();

      this.allocations.set(allocation.id, allocation);
      this.saveToStorage();

      return false;
    }
  }

  /**
   * Get user's credit allocation history
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<Array>} Array of allocations for the user
   */
  async getUserAllocations(userAddress) {
    try {
      if (!userAddress) {
        const currentUser = authService.getCurrentUser();
        if (!currentUser?.walletAddress) {
          return [];
        }
        userAddress = currentUser.walletAddress;
      }

      console.log("📋 Fetching allocations for user:", userAddress);

      const userAllocations = Array.from(this.allocations.values())
        .filter(
          (allocation) =>
            allocation.recipientAddress === userAddress ||
            (allocation.recipientEmail &&
              allocation.recipientEmail === authService.getCurrentUser()?.email)
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      console.log(`📋 Found ${userAllocations.length} allocations for user`);
      return userAllocations;
    } catch (error) {
      console.error("❌ Failed to get user allocations:", error);
      return [];
    }
  }

  /**
   * Get total allocated credits for a user
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<number>} Total allocated credits
   */
  async getUserTotalAllocatedCredits(userAddress) {
    try {
      const allocations = await this.getUserAllocations(userAddress);
      const total = allocations
        .filter((allocation) => allocation.status === "completed")
        .reduce((sum, allocation) => sum + (allocation.amount || 0), 0);

      return total;
    } catch (error) {
      console.error("❌ Failed to calculate total allocated credits:", error);
      return 0;
    }
  }

  /**
   * Get user's current blockchain balance
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<number>} Current blockchain balance
   */
  async getUserCurrentBalance(userAddress) {
    try {
      if (!userAddress) {
        const currentUser = authService.getCurrentUser();
        if (!currentUser?.walletAddress) {
          return 0;
        }
        userAddress = currentUser.walletAddress;
      }

      const tokens = await blockchainService.getUserTokens(userAddress);
      const totalBalance = tokens.reduce(
        (sum, token) => sum + token.balance,
        0
      );

      return totalBalance;
    } catch (error) {
      console.error("❌ Failed to get user balance:", error);
      return 0;
    }
  }

  /**
   * Get comprehensive user balance information
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<Object>} Balance information
   */
  async getUserBalanceInfo(userAddress) {
    try {
      const [currentBalance, totalAllocated, allocations, tokens] =
        await Promise.all([
          this.getUserCurrentBalance(userAddress),
          this.getUserTotalAllocatedCredits(userAddress),
          this.getUserAllocations(userAddress),
          blockchainService.getUserTokens(userAddress).catch(() => []),
        ]);

      const recentAllocations = allocations.slice(0, 5); // Last 5 allocations
      const pendingAllocations = allocations.filter(
        (a) => a.status === "pending" || a.status === "failed"
      );

      return {
        currentBalance,
        totalAllocated,
        totalAllocations: allocations.length,
        recentAllocations,
        pendingAllocations,
        tokens,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Failed to get user balance info:", error);
      return {
        currentBalance: 0,
        totalAllocated: 0,
        totalAllocations: 0,
        recentAllocations: [],
        pendingAllocations: [],
        tokens: [],
        lastUpdated: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Retry failed credit allocations
   * @param {string} allocationId - Allocation ID to retry
   * @returns {Promise<Object>} Retry result
   */
  async retryFailedAllocation(allocationId) {
    try {
      const allocation = this.allocations.get(allocationId);
      if (!allocation) {
        throw new Error("Allocation not found");
      }

      if (allocation.status !== "failed") {
        throw new Error("Only failed allocations can be retried");
      }

      console.log("🔄 Retrying failed allocation:", allocationId);

      // Update retry information
      allocation.retryCount += 1;
      allocation.lastRetryAt = new Date().toISOString();
      allocation.status = "retrying";

      this.allocations.set(allocationId, allocation);
      this.saveToStorage();

      // Attempt to send notification again
      const notificationSent = await this.sendAllocationNotification(
        allocation
      );

      if (notificationSent) {
        allocation.status = "completed";
        allocation.needsRetry = false;
      } else {
        allocation.status = "failed";
        allocation.needsRetry = true;
      }

      allocation.updatedAt = new Date().toISOString();
      this.allocations.set(allocationId, allocation);
      this.saveToStorage();

      return {
        success: allocation.status === "completed",
        allocation,
        message:
          allocation.status === "completed"
            ? "Allocation retry successful"
            : "Allocation retry failed",
      };
    } catch (error) {
      console.error("❌ Failed to retry allocation:", error);
      throw new Error(`Retry failed: ${error.message}`);
    }
  }

  /**
   * Get all failed allocations that need retry
   * @returns {Array} Failed allocations
   */
  getFailedAllocations() {
    return Array.from(this.allocations.values())
      .filter(
        (allocation) => allocation.status === "failed" && allocation.needsRetry
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Get allocation statistics
   * @returns {Object} Allocation statistics
   */
  getAllocationStats() {
    const allAllocations = Array.from(this.allocations.values());

    return {
      total: allAllocations.length,
      completed: allAllocations.filter((a) => a.status === "completed").length,
      failed: allAllocations.filter((a) => a.status === "failed").length,
      pending: allAllocations.filter((a) => a.status === "pending").length,
      totalAmount: allAllocations
        .filter((a) => a.status === "completed")
        .reduce((sum, a) => sum + (a.amount || 0), 0),
      notificationsSent: allAllocations.filter((a) => a.notificationSent)
        .length,
      needsRetry: allAllocations.filter((a) => a.needsRetry).length,
    };
  }

  /**
   * Request browser notification permission
   * @returns {Promise<boolean>} Permission granted
   */
  async requestNotificationPermission() {
    try {
      if (!("Notification" in window)) {
        console.warn("Browser does not support notifications");
        return false;
      }

      if (Notification.permission === "granted") {
        return true;
      }

      if (Notification.permission === "denied") {
        console.warn("Notification permission denied");
        return false;
      }

      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      return false;
    }
  }

  /**
   * Format address for display
   * @param {string} address - Wallet address
   * @returns {string} Formatted address
   */
  formatAddress(address) {
    if (!address) return "Unknown";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Format amount for display
   * @param {number} amount - Credit amount
   * @returns {string} Formatted amount
   */
  formatAmount(amount) {
    if (!amount) return "0";
    return new Intl.NumberFormat("en-US").format(amount);
  }

  /**
   * Clear all allocation data (for testing/reset)
   */
  clearAllAllocations() {
    this.allocations.clear();
    localStorage.removeItem("cblock_credit_allocations");
    console.log("🗑️ All allocation data cleared");
  }
}

// Create and export singleton instance
const creditAllocationService = new CreditAllocationService();
export default creditAllocationService;
