import { toast } from "react-hot-toast";
import authService from "./auth.js";

/**
 * Notification Service
 * Handles various types of notifications for credit allocations and system events
 */
class NotificationService {
  constructor() {
    this.notificationQueue = [];
    this.isProcessing = false;
    this.permissionRequested = false;

    // Initialize notification permission on first use
    this.initializeNotifications();
  }

  /**
   * Initialize notification system
   */
  async initializeNotifications() {
    try {
      // Request notification permission if supported
      if ("Notification" in window && !this.permissionRequested) {
        this.permissionRequested = true;

        if (Notification.permission === "default") {
          // Don't request permission immediately, wait for user interaction
          console.log(
            "📢 Browser notifications available, permission can be requested"
          );
        }
      }

      // Set up service worker for background notifications if available
      if ("serviceWorker" in navigator) {
        // Register service worker for notifications (optional enhancement)
        console.log(
          "🔧 Service worker support available for background notifications"
        );
      }
    } catch (error) {
      console.error("Failed to initialize notifications:", error);
    }
  }

  /**
   * Request notification permission from user
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
        console.warn("Notification permission denied by user");
        return false;
      }

      // Show a friendly prompt first
      const userWantsNotifications = window.confirm(
        "Would you like to receive notifications when you earn carbon credits? This helps you stay updated on your document verification progress."
      );

      if (!userWantsNotifications) {
        return false;
      }

      const permission = await Notification.requestPermission();
      const granted = permission === "granted";

      if (granted) {
        toast.success(
          "🔔 Notifications enabled! You'll be notified when you receive credits.",
          {
            duration: 5000,
          }
        );
      } else {
        toast.info(
          "You can enable notifications later in your browser settings.",
          {
            duration: 4000,
          }
        );
      }

      return granted;
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      return false;
    }
  }

  /**
   * Show credit allocation notification
   * @param {Object} allocation - Allocation data
   * @param {Object} options - Notification options
   */
  async showCreditAllocationNotification(allocation, options = {}) {
    try {
      const {
        showToast = true,
        showBrowserNotification = true,
        priority = "normal",
      } = options;

      console.log("📢 Showing credit allocation notification:", {
        allocationId: allocation.id,
        amount: allocation.amount,
        recipient: allocation.recipientAddress,
      });

      // Check if user is currently logged in and is the recipient
      const currentUser = authService.getCurrentUser();
      const isCurrentUser =
        currentUser &&
        (currentUser.walletAddress === allocation.recipientAddress ||
          currentUser.email === allocation.recipientEmail);

      // Show toast notification if user is current recipient
      if (showToast && isCurrentUser) {
        const toastMessage = `🎉 You received ${this.formatAmount(
          allocation.amount
        )} carbon credits from "${allocation.documentName}"!`;

        toast.success(toastMessage, {
          duration: 8000,
          icon: "💰",
          style: {
            background: "#10B981",
            color: "white",
            fontWeight: "500",
          },
          position: "top-right",
        });
      }

      // Show browser notification if permission granted
      if (
        showBrowserNotification &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const notification = new Notification("Carbon Credits Allocated! 💰", {
          body: `You received ${this.formatAmount(
            allocation.amount
          )} credits from "${allocation.documentName}"`,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: `credit-allocation-${allocation.id}`,
          requireInteraction: priority === "high",
          silent: priority === "low",
          data: {
            type: "credit-allocation",
            allocationId: allocation.id,
            amount: allocation.amount,
            documentName: allocation.documentName,
          },
        });

        // Handle notification click
        notification.onclick = () => {
          window.focus();
          notification.close();

          // Navigate to user dashboard or balance page
          if (window.location.pathname !== "/") {
            window.location.href = "/#balance";
          }
        };

        // Auto-close after 10 seconds
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

      // Log notification for analytics/debugging
      this.logNotification("credit-allocation", {
        allocationId: allocation.id,
        amount: allocation.amount,
        recipient: allocation.recipientAddress,
        documentName: allocation.documentName,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to show credit allocation notification:", error);
    }
  }

  /**
   * Show document status notification
   * @param {Object} document - Document data
   * @param {string} status - New status
   * @param {Object} options - Notification options
   */
  async showDocumentStatusNotification(document, status, options = {}) {
    try {
      const { showToast = true } = options;

      const statusMessages = {
        attested: {
          title: "Document Attested! ✅",
          message: `Your document "${
            document.projectName || document.filename
          }" has been verified and is ready for minting.`,
          color: "#10B981",
        },
        minted: {
          title: "Credits Minted! 🪙",
          message: `Carbon credits have been minted for your document "${
            document.projectName || document.filename
          }".`,
          color: "#059669",
        },
        rejected: {
          title: "Document Rejected ❌",
          message: `Your document "${
            document.projectName || document.filename
          }" was rejected during verification.`,
          color: "#DC2626",
        },
      };

      const config = statusMessages[status];
      if (!config) return;

      // Show toast notification
      if (showToast) {
        const toastMethod = status === "rejected" ? toast.error : toast.success;
        toastMethod(config.message, {
          duration: 6000,
          style: {
            background: config.color,
            color: "white",
          },
        });
      }

      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(config.title, {
          body: config.message,
          icon: "/favicon.ico",
          tag: `document-status-${document.id || document.cid}`,
          data: {
            type: "document-status",
            documentId: document.id || document.cid,
            status,
          },
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        setTimeout(() => {
          notification.close();
        }, 8000);
      }
    } catch (error) {
      console.error("Failed to show document status notification:", error);
    }
  }

  /**
   * Show system notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} options - Notification options
   */
  async showSystemNotification(title, message, options = {}) {
    try {
      const {
        type = "info",
        showToast = true,
        showBrowserNotification = false,
        duration = 5000,
      } = options;

      // Show toast notification
      if (showToast) {
        const toastMethod =
          {
            success: toast.success,
            error: toast.error,
            warning: toast.error, // Use error styling for warnings
            info: toast.success,
          }[type] || toast.success;

        toastMethod(message, { duration });
      }

      // Show browser notification
      if (
        showBrowserNotification &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const notification = new Notification(title, {
          body: message,
          icon: "/favicon.ico",
          tag: `system-${Date.now()}`,
        });

        setTimeout(() => {
          notification.close();
        }, duration);
      }
    } catch (error) {
      console.error("Failed to show system notification:", error);
    }
  }

  /**
   * Queue notification for later processing
   * @param {Function} notificationFn - Notification function to execute
   * @param {number} delay - Delay in milliseconds
   */
  queueNotification(notificationFn, delay = 0) {
    this.notificationQueue.push({
      fn: notificationFn,
      delay,
      timestamp: Date.now(),
    });

    if (!this.isProcessing) {
      this.processNotificationQueue();
    }
  }

  /**
   * Process queued notifications
   */
  async processNotificationQueue() {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift();
        const elapsed = Date.now() - notification.timestamp;
        const remainingDelay = Math.max(0, notification.delay - elapsed);

        if (remainingDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingDelay));
        }

        try {
          await notification.fn();
        } catch (error) {
          console.error("Failed to process queued notification:", error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Log notification for analytics/debugging
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   */
  logNotification(type, data) {
    try {
      const logEntry = {
        type,
        data,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Store in localStorage for debugging (keep last 100 entries)
      const logs = JSON.parse(
        localStorage.getItem("cblock_notification_logs") || "[]"
      );
      logs.push(logEntry);

      // Keep only last 100 entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      localStorage.setItem("cblock_notification_logs", JSON.stringify(logs));

      console.log("📝 Notification logged:", logEntry);
    } catch (error) {
      console.error("Failed to log notification:", error);
    }
  }

  /**
   * Get notification logs for debugging
   * @returns {Array} Notification logs
   */
  getNotificationLogs() {
    try {
      return JSON.parse(
        localStorage.getItem("cblock_notification_logs") || "[]"
      );
    } catch (error) {
      console.error("Failed to get notification logs:", error);
      return [];
    }
  }

  /**
   * Clear notification logs
   */
  clearNotificationLogs() {
    localStorage.removeItem("cblock_notification_logs");
    console.log("🗑️ Notification logs cleared");
  }

  /**
   * Format amount for display
   * @param {number} amount - Amount to format
   * @returns {string} Formatted amount
   */
  formatAmount(amount) {
    if (!amount) return "0";
    return new Intl.NumberFormat("en-US").format(amount);
  }

  /**
   * Check if notifications are supported and enabled
   * @returns {Object} Notification status
   */
  getNotificationStatus() {
    return {
      supported: "Notification" in window,
      permission:
        "Notification" in window ? Notification.permission : "unsupported",
      enabled:
        "Notification" in window && Notification.permission === "granted",
      serviceWorkerSupported: "serviceWorker" in navigator,
    };
  }

  /**
   * Test notification system
   */
  async testNotifications() {
    try {
      console.log("🧪 Testing notification system...");

      // Test toast notification
      toast.success("🧪 Test notification - Toast working!", {
        duration: 3000,
      });

      // Test browser notification if permission granted
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification("🧪 Test Notification", {
          body: "Browser notifications are working correctly!",
          icon: "/favicon.ico",
          tag: "test-notification",
        });

        setTimeout(() => {
          notification.close();
        }, 3000);
      } else if (
        "Notification" in window &&
        Notification.permission === "default"
      ) {
        const granted = await this.requestNotificationPermission();
        if (granted) {
          // Retry test after permission granted
          setTimeout(() => this.testNotifications(), 1000);
        }
      }

      console.log("✅ Notification test completed");
    } catch (error) {
      console.error("❌ Notification test failed:", error);
      toast.error("Notification test failed: " + error.message);
    }
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;
