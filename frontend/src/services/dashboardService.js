import authService from "./auth.js";
import creditAllocationService from "./creditAllocation.js";
import documentService from "./document.js";
import blockchainService from "./blockchain.js";
import { toast } from "react-hot-toast";

/**
 * Dashboard Service
 * Manages real-time updates and data synchronization for user dashboard
 */
class DashboardService {
  constructor() {
    this.updateCallbacks = new Set();
    this.isPolling = false;
    this.pollInterval = null;
    this.lastUpdateTime = null;
    this.cachedData = null;
  }

  /**
   * Subscribe to dashboard updates
   * @param {Function} callback - Callback function to call when data updates
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.updateCallbacks.add(callback);

    // Start polling if this is the first subscriber
    if (this.updateCallbacks.size === 1) {
      this.startPolling();
    }

    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);

      // Stop polling if no more subscribers
      if (this.updateCallbacks.size === 0) {
        this.stopPolling();
      }
    };
  }

  /**
   * Start polling for updates
   */
  startPolling() {
    if (this.isPolling) return;

    console.log("📊 Starting dashboard polling...");
    this.isPolling = true;

    // Initial load
    this.checkForUpdates();

    // Set up periodic polling (every 30 seconds)
    this.pollInterval = setInterval(() => {
      this.checkForUpdates();
    }, 30000);
  }

  /**
   * Stop polling for updates
   */
  stopPolling() {
    if (!this.isPolling) return;

    console.log("📊 Stopping dashboard polling...");
    this.isPolling = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Check for updates and notify subscribers
   */
  async checkForUpdates() {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.walletAddress) {
        return;
      }

      console.log("🔄 Checking for dashboard updates...");

      // Get current data
      const [
        balanceInfo,
        userDocuments,
        documentStats,
        blockchainTokens,
        allocationHistory,
      ] = await Promise.all([
        creditAllocationService.getUserBalanceInfo(currentUser.walletAddress),
        documentService.getUserDocuments().catch(() => []),
        documentService.getDocumentStats().catch(() => ({
          total: 0,
          pending: 0,
          attested: 0,
          minted: 0,
          rejected: 0,
        })),
        blockchainService
          .getUserTokens(currentUser.walletAddress)
          .catch(() => []),
        creditAllocationService
          .getUserAllocations(currentUser.walletAddress)
          .catch(() => []),
      ]);

      const newData = {
        user: currentUser,
        balance: balanceInfo,
        documents: userDocuments,
        documentStats,
        tokens: blockchainTokens,
        allocations: allocationHistory,
        lastUpdated: new Date().toISOString(),
      };

      // Check if data has changed
      const hasChanges = this.detectChanges(newData);

      if (hasChanges) {
        console.log("✅ Dashboard data updated, notifying subscribers...");

        // Cache the new data
        this.cachedData = newData;
        this.lastUpdateTime = new Date().toISOString();

        // Notify all subscribers
        this.updateCallbacks.forEach((callback) => {
          try {
            callback(newData);
          } catch (error) {
            console.error("❌ Error in dashboard update callback:", error);
          }
        });

        // Show notification for significant changes
        this.notifySignificantChanges(newData);
      }
    } catch (error) {
      console.error("❌ Failed to check for dashboard updates:", error);
    }
  }

  /**
   * Detect changes in dashboard data
   * @param {Object} newData - New dashboard data
   * @returns {boolean} Whether changes were detected
   */
  detectChanges(newData) {
    if (!this.cachedData) {
      return true; // First load
    }

    // Check for changes in key metrics
    const oldData = this.cachedData;

    // Check balance changes
    if (
      newData.balance.currentBalance !== oldData.balance.currentBalance ||
      newData.balance.totalAllocated !== oldData.balance.totalAllocated ||
      newData.allocations.length !== oldData.allocations.length
    ) {
      return true;
    }

    // Check document changes
    if (newData.documents.length !== oldData.documents.length) {
      return true;
    }

    // Check for document status changes
    const oldDocumentStatuses = oldData.documents.map(
      (doc) => `${doc.id}:${doc.status}`
    );
    const newDocumentStatuses = newData.documents.map(
      (doc) => `${doc.id}:${doc.status}`
    );

    if (
      JSON.stringify(oldDocumentStatuses) !==
      JSON.stringify(newDocumentStatuses)
    ) {
      return true;
    }

    // Check token changes
    if (newData.tokens.length !== oldData.tokens.length) {
      return true;
    }

    const oldTokenBalances = oldData.tokens.reduce(
      (sum, token) => sum + token.balance,
      0
    );
    const newTokenBalances = newData.tokens.reduce(
      (sum, token) => sum + token.balance,
      0
    );

    if (oldTokenBalances !== newTokenBalances) {
      return true;
    }

    return false;
  }

  /**
   * Show notifications for significant changes
   * @param {Object} newData - New dashboard data
   */
  notifySignificantChanges(newData) {
    if (!this.cachedData) return;

    const oldData = this.cachedData;

    // New credit allocations
    const newAllocations = newData.allocations.filter(
      (allocation) =>
        !oldData.allocations.some((oldAlloc) => oldAlloc.id === allocation.id)
    );

    newAllocations.forEach((allocation) => {
      if (allocation.status === "completed") {
        toast.success(
          `🎉 You received ${new Intl.NumberFormat("en-US").format(
            allocation.amount
          )} credits!`,
          {
            duration: 5000,
            position: "top-right",
          }
        );
      }
    });

    // Document status changes
    newData.documents.forEach((newDoc) => {
      const oldDoc = oldData.documents.find((doc) => doc.id === newDoc.id);

      if (oldDoc && oldDoc.status !== newDoc.status) {
        switch (newDoc.status) {
          case "attested":
            toast.success(
              `✅ Document "${
                newDoc.projectName || newDoc.filename
              }" has been attested!`,
              { duration: 4000 }
            );
            break;
          case "minted":
            toast.success(
              `🪙 Document "${
                newDoc.projectName || newDoc.filename
              }" has been minted!`,
              { duration: 4000 }
            );
            break;
          case "rejected":
            toast.error(
              `❌ Document "${
                newDoc.projectName || newDoc.filename
              }" was rejected`,
              { duration: 4000 }
            );
            break;
        }
      }
    });

    // Balance increases
    if (newData.balance.currentBalance > oldData.balance.currentBalance) {
      const increase =
        newData.balance.currentBalance - oldData.balance.currentBalance;
      toast.success(
        `💰 Your balance increased by ${new Intl.NumberFormat("en-US").format(
          increase
        )} credits!`,
        { duration: 4000 }
      );
    }
  }

  /**
   * Force refresh dashboard data
   * @returns {Promise<Object>} Updated dashboard data
   */
  async forceRefresh() {
    console.log("🔄 Force refreshing dashboard data...");

    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.walletAddress) {
        throw new Error("User not authenticated");
      }

      // Clear cached data to force update
      this.cachedData = null;

      // Check for updates
      await this.checkForUpdates();

      return this.cachedData;
    } catch (error) {
      console.error("❌ Failed to force refresh dashboard:", error);
      throw error;
    }
  }

  /**
   * Get cached dashboard data
   * @returns {Object|null} Cached dashboard data
   */
  getCachedData() {
    return this.cachedData;
  }

  /**
   * Get last update time
   * @returns {string|null} Last update timestamp
   */
  getLastUpdateTime() {
    return this.lastUpdateTime;
  }

  /**
   * Check if service is currently polling
   * @returns {boolean} Whether service is polling
   */
  isPollingActive() {
    return this.isPolling;
  }

  /**
   * Set polling interval
   * @param {number} intervalMs - Polling interval in milliseconds
   */
  setPollingInterval(intervalMs) {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    if (this.isPolling) {
      this.pollInterval = setInterval(() => {
        this.checkForUpdates();
      }, intervalMs);
    }
  }

  /**
   * Get dashboard summary for notifications
   * @returns {Promise<Object>} Dashboard summary
   */
  async getDashboardSummary() {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.walletAddress) {
        return null;
      }

      const [balanceInfo, documentStats] = await Promise.all([
        creditAllocationService.getUserBalanceInfo(currentUser.walletAddress),
        documentService.getDocumentStats(),
      ]);

      return {
        currentBalance: balanceInfo.currentBalance,
        totalAllocated: balanceInfo.totalAllocated,
        totalDocuments: documentStats.total,
        pendingDocuments: documentStats.pending,
        verificationRate:
          documentStats.total > 0
            ? ((documentStats.attested + documentStats.minted) /
                documentStats.total) *
              100
            : 0,
      };
    } catch (error) {
      console.error("❌ Failed to get dashboard summary:", error);
      return null;
    }
  }

  /**
   * Cleanup service resources
   */
  cleanup() {
    this.stopPolling();
    this.updateCallbacks.clear();
    this.cachedData = null;
    this.lastUpdateTime = null;
  }
}

// Create and export singleton instance
const dashboardService = new DashboardService();
export default dashboardService;
