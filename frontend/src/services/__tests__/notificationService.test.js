import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import notificationService from "../notificationService.js";
import authService from "../auth.js";

// Mock dependencies
vi.mock("../auth.js");
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock Notification API
const mockNotification = vi.fn();
global.Notification = mockNotification;
global.Notification.permission = "granted";
global.Notification.requestPermission = vi.fn().mockResolvedValue("granted");

// Mock window.confirm
global.confirm = vi.fn().mockReturnValue(true);

describe("NotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue("[]");

    // Mock auth service
    authService.getCurrentUser.mockReturnValue({
      walletAddress: "0x123456789",
      name: "Test User",
      email: "test@example.com",
    });

    // Reset notification permission
    global.Notification.permission = "granted";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("requestNotificationPermission", () => {
    it("should return true if permission already granted", async () => {
      global.Notification.permission = "granted";

      const result = await notificationService.requestNotificationPermission();

      expect(result).toBe(true);
      expect(global.Notification.requestPermission).not.toHaveBeenCalled();
    });

    it("should return false if permission denied", async () => {
      global.Notification.permission = "denied";

      const result = await notificationService.requestNotificationPermission();

      expect(result).toBe(false);
      expect(global.Notification.requestPermission).not.toHaveBeenCalled();
    });

    it("should request permission if default", async () => {
      global.Notification.permission = "default";
      global.Notification.requestPermission.mockResolvedValue("granted");

      const result = await notificationService.requestNotificationPermission();

      expect(result).toBe(true);
      expect(global.Notification.requestPermission).toHaveBeenCalled();
    });

    it("should handle user declining permission request", async () => {
      global.Notification.permission = "default";
      global.confirm.mockReturnValue(false);

      const result = await notificationService.requestNotificationPermission();

      expect(result).toBe(false);
      expect(global.Notification.requestPermission).not.toHaveBeenCalled();
    });

    it("should return false if notifications not supported", async () => {
      delete global.Notification;

      const result = await notificationService.requestNotificationPermission();

      expect(result).toBe(false);
    });
  });

  describe("showCreditAllocationNotification", () => {
    const mockAllocation = {
      id: "alloc_123",
      amount: 100,
      documentName: "Test Project",
      recipientAddress: "0x123456789",
      recipientEmail: "test@example.com",
    };

    it("should show toast and browser notification for current user", async () => {
      const { toast } = await import("react-hot-toast");

      await notificationService.showCreditAllocationNotification(
        mockAllocation
      );

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("You received 100 carbon credits"),
        expect.objectContaining({
          duration: 8000,
          icon: "💰",
        })
      );

      expect(mockNotification).toHaveBeenCalledWith(
        "Carbon Credits Allocated! 💰",
        expect.objectContaining({
          body: expect.stringContaining("You received 100 credits"),
          icon: "/favicon.ico",
          tag: "credit-allocation-alloc_123",
        })
      );
    });

    it("should not show toast for different user", async () => {
      authService.getCurrentUser.mockReturnValue({
        walletAddress: "0xDifferentUser",
        email: "different@example.com",
      });

      const { toast } = await import("react-hot-toast");

      await notificationService.showCreditAllocationNotification(
        mockAllocation
      );

      expect(toast.success).not.toHaveBeenCalled();
      expect(mockNotification).toHaveBeenCalled(); // Browser notification still shown
    });

    it("should not show browser notification if permission not granted", async () => {
      global.Notification.permission = "denied";

      await notificationService.showCreditAllocationNotification(
        mockAllocation
      );

      expect(mockNotification).not.toHaveBeenCalled();
    });

    it("should handle notification options", async () => {
      const options = {
        showToast: false,
        showBrowserNotification: true,
        priority: "high",
      };

      const { toast } = await import("react-hot-toast");

      await notificationService.showCreditAllocationNotification(
        mockAllocation,
        options
      );

      expect(toast.success).not.toHaveBeenCalled();
      expect(mockNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          requireInteraction: true, // High priority
        })
      );
    });
  });

  describe("showDocumentStatusNotification", () => {
    const mockDocument = {
      id: "doc_123",
      projectName: "Test Project",
      filename: "test.pdf",
    };

    it("should show attested notification", async () => {
      const { toast } = await import("react-hot-toast");

      await notificationService.showDocumentStatusNotification(
        mockDocument,
        "attested"
      );

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("verified and is ready for minting"),
        expect.objectContaining({
          duration: 6000,
          style: { background: "#10B981", color: "white" },
        })
      );

      expect(mockNotification).toHaveBeenCalledWith(
        "Document Attested! ✅",
        expect.objectContaining({
          body: expect.stringContaining("verified and is ready for minting"),
        })
      );
    });

    it("should show minted notification", async () => {
      const { toast } = await import("react-hot-toast");

      await notificationService.showDocumentStatusNotification(
        mockDocument,
        "minted"
      );

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("Carbon credits have been minted"),
        expect.any(Object)
      );
    });

    it("should show rejected notification as error", async () => {
      const { toast } = await import("react-hot-toast");

      await notificationService.showDocumentStatusNotification(
        mockDocument,
        "rejected"
      );

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("was rejected during verification"),
        expect.any(Object)
      );
    });

    it("should handle unknown status gracefully", async () => {
      const { toast } = await import("react-hot-toast");

      await notificationService.showDocumentStatusNotification(
        mockDocument,
        "unknown"
      );

      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(mockNotification).not.toHaveBeenCalled();
    });
  });

  describe("showSystemNotification", () => {
    it("should show success system notification", async () => {
      const { toast } = await import("react-hot-toast");

      await notificationService.showSystemNotification(
        "System Update",
        "System has been updated successfully",
        { type: "success", showToast: true }
      );

      expect(toast.success).toHaveBeenCalledWith(
        "System has been updated successfully",
        { duration: 5000 }
      );
    });

    it("should show error system notification", async () => {
      const { toast } = await import("react-hot-toast");

      await notificationService.showSystemNotification(
        "System Error",
        "An error occurred",
        { type: "error", showToast: true }
      );

      expect(toast.error).toHaveBeenCalledWith("An error occurred", {
        duration: 5000,
      });
    });

    it("should show browser notification when enabled", async () => {
      await notificationService.showSystemNotification(
        "System Update",
        "System has been updated",
        { showBrowserNotification: true }
      );

      expect(mockNotification).toHaveBeenCalledWith(
        "System Update",
        expect.objectContaining({
          body: "System has been updated",
        })
      );
    });
  });

  describe("notification logging", () => {
    it("should log notifications to localStorage", async () => {
      const mockAllocation = {
        id: "alloc_123",
        amount: 100,
        documentName: "Test Project",
        recipientAddress: "0x123456789",
      };

      await notificationService.showCreditAllocationNotification(
        mockAllocation
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "cblock_notification_logs",
        expect.any(String)
      );

      // Verify log structure
      const logCall = localStorageMock.setItem.mock.calls.find(
        (call) => call[0] === "cblock_notification_logs"
      );
      const logs = JSON.parse(logCall[1]);
      expect(logs).toBeInstanceOf(Array);
      expect(logs[0]).toMatchObject({
        type: "credit-allocation",
        data: expect.objectContaining({
          allocationId: "alloc_123",
          amount: 100,
        }),
        timestamp: expect.any(String),
      });
    });

    it("should limit logs to 100 entries", () => {
      // Mock existing logs with 100 entries
      const existingLogs = Array.from({ length: 100 }, (_, i) => ({
        type: "test",
        data: { id: i },
        timestamp: new Date().toISOString(),
      }));
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingLogs));

      notificationService.logNotification("new-type", { id: "new" });

      const logCall = localStorageMock.setItem.mock.calls.find(
        (call) => call[0] === "cblock_notification_logs"
      );
      const logs = JSON.parse(logCall[1]);
      expect(logs.length).toBe(100);
      expect(logs[99].type).toBe("new-type");
    });

    it("should handle localStorage errors gracefully", () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      expect(() => {
        notificationService.logNotification("test", { id: "test" });
      }).not.toThrow();
    });
  });

  describe("getNotificationStatus", () => {
    it("should return correct status when notifications supported and enabled", () => {
      global.Notification.permission = "granted";

      const status = notificationService.getNotificationStatus();

      expect(status).toEqual({
        supported: true,
        permission: "granted",
        enabled: true,
        serviceWorkerSupported: expect.any(Boolean),
      });
    });

    it("should return correct status when notifications not supported", () => {
      delete global.Notification;

      const status = notificationService.getNotificationStatus();

      expect(status).toEqual({
        supported: false,
        permission: "unsupported",
        enabled: false,
        serviceWorkerSupported: expect.any(Boolean),
      });
    });
  });

  describe("testNotifications", () => {
    it("should test toast and browser notifications", async () => {
      const { toast } = await import("react-hot-toast");

      await notificationService.testNotifications();

      expect(toast.success).toHaveBeenCalledWith(
        "🧪 Test notification - Toast working!",
        { duration: 3000 }
      );

      expect(mockNotification).toHaveBeenCalledWith(
        "🧪 Test Notification",
        expect.objectContaining({
          body: "Browser notifications are working correctly!",
        })
      );
    });

    it("should request permission if not granted", async () => {
      global.Notification.permission = "default";
      global.Notification.requestPermission.mockResolvedValue("granted");

      await notificationService.testNotifications();

      expect(global.Notification.requestPermission).toHaveBeenCalled();
    });

    it("should handle test errors gracefully", async () => {
      const { toast } = await import("react-hot-toast");
      toast.success.mockImplementation(() => {
        throw new Error("Toast error");
      });

      await expect(
        notificationService.testNotifications()
      ).resolves.not.toThrow();
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Notification test failed")
      );
    });
  });

  describe("formatAmount", () => {
    it("should format amount with commas", () => {
      const formatted = notificationService.formatAmount(1234567);
      expect(formatted).toBe("1,234,567");
    });

    it("should handle zero and null values", () => {
      expect(notificationService.formatAmount(0)).toBe("0");
      expect(notificationService.formatAmount(null)).toBe("0");
      expect(notificationService.formatAmount(undefined)).toBe("0");
    });
  });

  describe("notification queue", () => {
    it("should queue and process notifications with delay", async () => {
      const { toast } = await import("react-hot-toast");
      const notificationFn = vi.fn().mockResolvedValue(true);

      notificationService.queueNotification(notificationFn, 100);

      // Should not be called immediately
      expect(notificationFn).not.toHaveBeenCalled();

      // Wait for delay
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(notificationFn).toHaveBeenCalled();
    });

    it("should process multiple queued notifications in order", async () => {
      const calls = [];
      const fn1 = vi.fn().mockImplementation(() => calls.push("fn1"));
      const fn2 = vi.fn().mockImplementation(() => calls.push("fn2"));

      notificationService.queueNotification(fn1, 50);
      notificationService.queueNotification(fn2, 100);

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(calls).toEqual(["fn1", "fn2"]);
    });
  });
});
