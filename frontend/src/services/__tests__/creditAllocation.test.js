import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import creditAllocationService from "../creditAllocation.js";
import authService from "../auth.js";
import blockchainService from "../blockchain.js";

// Mock dependencies
vi.mock("../auth.js");
vi.mock("../blockchain.js");
vi.mock("./notificationService.js", () => ({
  default: {
    showCreditAllocationNotification: vi.fn().mockResolvedValue(true),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock Notification API
global.Notification = {
  permission: "granted",
  requestPermission: vi.fn().mockResolvedValue("granted"),
};

describe("CreditAllocationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // Mock auth service
    authService.getCurrentUser.mockReturnValue({
      walletAddress: "0x123456789",
      name: "Test User",
      email: "test@example.com",
    });

    // Mock blockchain service
    blockchainService.getUserTokens.mockResolvedValue([
      { tokenId: 1, balance: 100 },
      { tokenId: 2, balance: 50 },
    ]);

    // Clear service state
    creditAllocationService.clearAllAllocations();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("processAutomaticAllocation", () => {
    it("should process allocation successfully", async () => {
      const mintingResult = {
        hash: "0xMintTxHash123",
        recipient: "0x987654321",
        amount: 100,
        tokenId: 1,
        receipt: { blockNumber: 12345 },
      };

      const documentData = {
        id: "doc_123",
        projectName: "Test Project",
        filename: "test.pdf",
        uploaderName: "Document Uploader",
        uploaderEmail: "uploader@example.com",
      };

      const result = await creditAllocationService.processAutomaticAllocation(
        mintingResult,
        documentData
      );

      expect(result.success).toBe(true);
      expect(result.allocation).toBeDefined();
      expect(result.allocation.recipientAddress).toBe(mintingResult.recipient);
      expect(result.allocation.amount).toBe(mintingResult.amount);
      expect(result.allocation.status).toBe("completed");
      expect(result.allocation.notificationSent).toBe(true);
    });

    it("should handle allocation failure gracefully", async () => {
      const mintingResult = {
        hash: "0xMintTxHash123",
        recipient: "0x987654321",
        amount: 100,
      };

      const documentData = {
        id: "doc_123",
        projectName: "Test Project",
      };

      // Mock notification service to throw error
      const notificationService = await import("../notificationService.js");
      notificationService.default.showCreditAllocationNotification.mockRejectedValue(
        new Error("Notification failed")
      );

      await expect(
        creditAllocationService.processAutomaticAllocation(
          mintingResult,
          documentData
        )
      ).rejects.toThrow("Credit allocation failed");

      // Should create failed allocation record
      const failedAllocations = creditAllocationService.getFailedAllocations();
      expect(failedAllocations.length).toBe(1);
      expect(failedAllocations[0].status).toBe("failed");
    });
  });

  describe("getUserAllocations", () => {
    beforeEach(async () => {
      // Create test allocation
      const mintingResult = {
        hash: "0xMintTxHash123",
        recipient: "0x123456789", // Same as current user
        amount: 100,
        tokenId: 1,
      };

      const documentData = {
        id: "doc_123",
        projectName: "Test Project",
        uploaderName: "Test User",
        uploaderEmail: "test@example.com",
      };

      await creditAllocationService.processAutomaticAllocation(
        mintingResult,
        documentData
      );
    });

    it("should return user allocations", async () => {
      const allocations = await creditAllocationService.getUserAllocations(
        "0x123456789"
      );

      expect(allocations.length).toBe(1);
      expect(allocations[0].recipientAddress).toBe("0x123456789");
      expect(allocations[0].amount).toBe(100);
      expect(allocations[0].status).toBe("completed");
    });

    it("should return empty array for user with no allocations", async () => {
      const allocations = await creditAllocationService.getUserAllocations(
        "0xOtherUser"
      );

      expect(allocations.length).toBe(0);
    });

    it("should use current user if no address provided", async () => {
      const allocations = await creditAllocationService.getUserAllocations();

      expect(allocations.length).toBe(1);
      expect(allocations[0].recipientAddress).toBe("0x123456789");
    });
  });

  describe("getUserTotalAllocatedCredits", () => {
    beforeEach(async () => {
      // Create multiple test allocations
      const allocations = [
        {
          mintingResult: {
            hash: "0xTx1",
            recipient: "0x123456789",
            amount: 100,
            tokenId: 1,
          },
          documentData: { id: "doc_1", projectName: "Project 1" },
        },
        {
          mintingResult: {
            hash: "0xTx2",
            recipient: "0x123456789",
            amount: 50,
            tokenId: 2,
          },
          documentData: { id: "doc_2", projectName: "Project 2" },
        },
      ];

      for (const { mintingResult, documentData } of allocations) {
        await creditAllocationService.processAutomaticAllocation(
          mintingResult,
          documentData
        );
      }
    });

    it("should calculate total allocated credits correctly", async () => {
      const total = await creditAllocationService.getUserTotalAllocatedCredits(
        "0x123456789"
      );

      expect(total).toBe(150); // 100 + 50
    });

    it("should return 0 for user with no allocations", async () => {
      const total = await creditAllocationService.getUserTotalAllocatedCredits(
        "0xOtherUser"
      );

      expect(total).toBe(0);
    });
  });

  describe("getUserCurrentBalance", () => {
    it("should return current blockchain balance", async () => {
      const balance = await creditAllocationService.getUserCurrentBalance(
        "0x123456789"
      );

      expect(balance).toBe(150); // 100 + 50 from mocked tokens
      expect(blockchainService.getUserTokens).toHaveBeenCalledWith(
        "0x123456789"
      );
    });

    it("should handle blockchain service errors", async () => {
      blockchainService.getUserTokens.mockRejectedValue(
        new Error("Blockchain error")
      );

      const balance = await creditAllocationService.getUserCurrentBalance(
        "0x123456789"
      );

      expect(balance).toBe(0);
    });
  });

  describe("getUserBalanceInfo", () => {
    beforeEach(async () => {
      // Create test allocation
      const mintingResult = {
        hash: "0xMintTxHash123",
        recipient: "0x123456789",
        amount: 100,
        tokenId: 1,
      };

      const documentData = {
        id: "doc_123",
        projectName: "Test Project",
      };

      await creditAllocationService.processAutomaticAllocation(
        mintingResult,
        documentData
      );
    });

    it("should return comprehensive balance information", async () => {
      const balanceInfo = await creditAllocationService.getUserBalanceInfo(
        "0x123456789"
      );

      expect(balanceInfo.currentBalance).toBe(150); // From mocked blockchain
      expect(balanceInfo.totalAllocated).toBe(100); // From allocation
      expect(balanceInfo.totalAllocations).toBe(1);
      expect(balanceInfo.recentAllocations.length).toBe(1);
      expect(balanceInfo.pendingAllocations.length).toBe(0);
      expect(balanceInfo.tokens.length).toBe(2);
    });
  });

  describe("retryFailedAllocation", () => {
    let failedAllocationId;

    beforeEach(async () => {
      // Create a failed allocation
      const mintingResult = {
        hash: "0xMintTxHash123",
        recipient: "0x123456789",
        amount: 100,
      };

      const documentData = {
        id: "doc_123",
        projectName: "Test Project",
      };

      // Mock notification service to fail initially
      const notificationService = await import("../notificationService.js");
      notificationService.default.showCreditAllocationNotification.mockRejectedValueOnce(
        new Error("Notification failed")
      );

      try {
        await creditAllocationService.processAutomaticAllocation(
          mintingResult,
          documentData
        );
      } catch (error) {
        // Expected to fail
      }

      const failedAllocations = creditAllocationService.getFailedAllocations();
      failedAllocationId = failedAllocations[0].id;
    });

    it("should retry failed allocation successfully", async () => {
      // Mock notification service to succeed on retry
      const notificationService = await import("../notificationService.js");
      notificationService.default.showCreditAllocationNotification.mockResolvedValue(
        true
      );

      const result = await creditAllocationService.retryFailedAllocation(
        failedAllocationId
      );

      expect(result.success).toBe(true);
      expect(result.allocation.status).toBe("completed");
      expect(result.allocation.retryCount).toBe(1);
    });

    it("should handle retry failure", async () => {
      // Mock notification service to fail again
      const notificationService = await import("../notificationService.js");
      notificationService.default.showCreditAllocationNotification.mockResolvedValue(
        false
      );

      const result = await creditAllocationService.retryFailedAllocation(
        failedAllocationId
      );

      expect(result.success).toBe(false);
      expect(result.allocation.status).toBe("failed");
      expect(result.allocation.retryCount).toBe(1);
    });

    it("should throw error for non-existent allocation", async () => {
      await expect(
        creditAllocationService.retryFailedAllocation("non-existent-id")
      ).rejects.toThrow("Allocation not found");
    });

    it("should throw error for non-failed allocation", async () => {
      // Create a successful allocation
      const mintingResult = {
        hash: "0xMintTxHash456",
        recipient: "0x123456789",
        amount: 50,
        tokenId: 2,
      };

      const documentData = {
        id: "doc_456",
        projectName: "Success Project",
      };

      const result = await creditAllocationService.processAutomaticAllocation(
        mintingResult,
        documentData
      );

      await expect(
        creditAllocationService.retryFailedAllocation(result.allocation.id)
      ).rejects.toThrow("Only failed allocations can be retried");
    });
  });

  describe("getAllocationStats", () => {
    beforeEach(async () => {
      // Create multiple allocations with different statuses
      const allocations = [
        {
          mintingResult: {
            hash: "0xTx1",
            recipient: "0x123456789",
            amount: 100,
            tokenId: 1,
          },
          documentData: { id: "doc_1", projectName: "Project 1" },
          shouldFail: false,
        },
        {
          mintingResult: {
            hash: "0xTx2",
            recipient: "0x123456789",
            amount: 50,
            tokenId: 2,
          },
          documentData: { id: "doc_2", projectName: "Project 2" },
          shouldFail: true,
        },
      ];

      const notificationService = await import("../notificationService.js");

      for (const { mintingResult, documentData, shouldFail } of allocations) {
        if (shouldFail) {
          notificationService.default.showCreditAllocationNotification.mockRejectedValueOnce(
            new Error("Notification failed")
          );
          try {
            await creditAllocationService.processAutomaticAllocation(
              mintingResult,
              documentData
            );
          } catch (error) {
            // Expected to fail
          }
        } else {
          notificationService.default.showCreditAllocationNotification.mockResolvedValueOnce(
            true
          );
          await creditAllocationService.processAutomaticAllocation(
            mintingResult,
            documentData
          );
        }
      }
    });

    it("should return correct allocation statistics", () => {
      const stats = creditAllocationService.getAllocationStats();

      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(0);
      expect(stats.totalAmount).toBe(100); // Only completed allocations
      expect(stats.notificationsSent).toBe(1);
      expect(stats.needsRetry).toBe(1);
    });
  });

  describe("formatAddress", () => {
    it("should format address correctly", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678";
      const formatted = creditAllocationService.formatAddress(address);

      expect(formatted).toBe("0x1234...5678");
    });

    it("should handle empty address", () => {
      const formatted = creditAllocationService.formatAddress("");

      expect(formatted).toBe("Unknown");
    });

    it("should handle null address", () => {
      const formatted = creditAllocationService.formatAddress(null);

      expect(formatted).toBe("Unknown");
    });
  });

  describe("formatAmount", () => {
    it("should format amount with commas", () => {
      const formatted = creditAllocationService.formatAmount(1234567);

      expect(formatted).toBe("1,234,567");
    });

    it("should handle zero amount", () => {
      const formatted = creditAllocationService.formatAmount(0);

      expect(formatted).toBe("0");
    });

    it("should handle null amount", () => {
      const formatted = creditAllocationService.formatAmount(null);

      expect(formatted).toBe("0");
    });
  });

  describe("storage operations", () => {
    it("should save and load allocations from localStorage", async () => {
      const mintingResult = {
        hash: "0xMintTxHash123",
        recipient: "0x123456789",
        amount: 100,
        tokenId: 1,
      };

      const documentData = {
        id: "doc_123",
        projectName: "Test Project",
      };

      await creditAllocationService.processAutomaticAllocation(
        mintingResult,
        documentData
      );

      // Verify localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "cblock_credit_allocations",
        expect.any(String)
      );

      // Verify the saved data structure
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toBeInstanceOf(Array);
      expect(savedData.length).toBe(1);
      expect(savedData[0][1].recipientAddress).toBe("0x123456789");
    });

    it("should handle localStorage errors gracefully", () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      // Should not throw error
      expect(() => {
        creditAllocationService.saveToStorage();
      }).not.toThrow();
    });
  });
});
