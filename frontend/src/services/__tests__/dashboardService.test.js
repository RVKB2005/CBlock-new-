import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import dashboardService from "../dashboardService.js";
import authService from "../auth.js";
import creditAllocationService from "../creditAllocation.js";
import documentService from "../document.js";
import blockchainService from "../blockchain.js";

// Mock dependencies
vi.mock("../auth.js");
vi.mock("../creditAllocation.js");
vi.mock("../document.js");
vi.mock("../blockchain.js");
vi.mock("react-hot-toast");

describe("DashboardService", () => {
  const mockUser = {
    walletAddress: "0x1234567890123456789012345678901234567890",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    accountType: "individual",
  };

  const mockBalanceInfo = {
    currentBalance: 1500,
    totalAllocated: 2000,
    totalAllocations: 5,
    recentAllocations: [],
    pendingAllocations: [],
  };

  const mockDocuments = [
    {
      id: "doc1",
      projectName: "Wind Farm Project",
      status: "minted",
      estimatedCredits: 1000,
      createdAt: "2024-01-10T10:00:00Z",
    },
  ];

  const mockDocumentStats = {
    total: 1,
    pending: 0,
    attested: 0,
    minted: 1,
    rejected: 0,
  };

  const mockTokens = [
    {
      tokenId: 1,
      balance: 1000,
      gsProjectId: "GS001",
      gsSerial: "ABC123",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock auth service
    authService.getCurrentUser.mockReturnValue(mockUser);

    // Mock credit allocation service
    creditAllocationService.getUserBalanceInfo.mockResolvedValue(
      mockBalanceInfo
    );
    creditAllocationService.getUserAllocations.mockResolvedValue([]);

    // Mock document service
    documentService.getUserDocuments.mockResolvedValue(mockDocuments);
    documentService.getDocumentStats.mockResolvedValue(mockDocumentStats);

    // Mock blockchain service
    blockchainService.getUserTokens.mockResolvedValue(mockTokens);

    // Reset service state
    dashboardService.cleanup();
  });

  afterEach(() => {
    vi.useRealTimers();
    dashboardService.cleanup();
  });

  describe("Subscription Management", () => {
    it("starts polling when first subscriber is added", () => {
      expect(dashboardService.isPollingActive()).toBe(false);

      const unsubscribe = dashboardService.subscribe(() => {});

      expect(dashboardService.isPollingActive()).toBe(true);

      unsubscribe();
    });

    it("stops polling when last subscriber is removed", () => {
      const unsubscribe1 = dashboardService.subscribe(() => {});
      const unsubscribe2 = dashboardService.subscribe(() => {});

      expect(dashboardService.isPollingActive()).toBe(true);

      unsubscribe1();
      expect(dashboardService.isPollingActive()).toBe(true);

      unsubscribe2();
      expect(dashboardService.isPollingActive()).toBe(false);
    });

    it("calls subscribers when data updates", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      dashboardService.subscribe(callback1);
      dashboardService.subscribe(callback2);

      await dashboardService.checkForUpdates();

      expect(callback1).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          balance: mockBalanceInfo,
          documents: mockDocuments,
        })
      );

      expect(callback2).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          balance: mockBalanceInfo,
          documents: mockDocuments,
        })
      );
    });

    it("handles callback errors gracefully", async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error("Callback error");
      });
      const normalCallback = vi.fn();

      dashboardService.subscribe(errorCallback);
      dashboardService.subscribe(normalCallback);

      await dashboardService.checkForUpdates();

      // Normal callback should still be called despite error in other callback
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe("Data Loading", () => {
    it("loads dashboard data correctly", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      await dashboardService.checkForUpdates();

      expect(creditAllocationService.getUserBalanceInfo).toHaveBeenCalledWith(
        mockUser.walletAddress
      );
      expect(documentService.getUserDocuments).toHaveBeenCalled();
      expect(documentService.getDocumentStats).toHaveBeenCalled();
      expect(blockchainService.getUserTokens).toHaveBeenCalledWith(
        mockUser.walletAddress
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          balance: mockBalanceInfo,
          documents: mockDocuments,
          documentStats: mockDocumentStats,
          tokens: mockTokens,
        })
      );
    });

    it("handles service errors gracefully", async () => {
      creditAllocationService.getUserBalanceInfo.mockRejectedValue(
        new Error("Service error")
      );

      const callback = vi.fn();
      dashboardService.subscribe(callback);

      await dashboardService.checkForUpdates();

      // Should not call callback on error
      expect(callback).not.toHaveBeenCalled();
    });

    it("skips update when user is not authenticated", async () => {
      authService.getCurrentUser.mockReturnValue(null);

      const callback = vi.fn();
      dashboardService.subscribe(callback);

      await dashboardService.checkForUpdates();

      expect(creditAllocationService.getUserBalanceInfo).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
    });

    it("skips update when user has no wallet address", async () => {
      authService.getCurrentUser.mockReturnValue({
        ...mockUser,
        walletAddress: null,
      });

      const callback = vi.fn();
      dashboardService.subscribe(callback);

      await dashboardService.checkForUpdates();

      expect(creditAllocationService.getUserBalanceInfo).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("Change Detection", () => {
    it("detects balance changes", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      // First update
      await dashboardService.checkForUpdates();
      expect(callback).toHaveBeenCalledTimes(1);

      // Change balance
      creditAllocationService.getUserBalanceInfo.mockResolvedValue({
        ...mockBalanceInfo,
        currentBalance: 2000, // Changed
      });

      // Second update
      await dashboardService.checkForUpdates();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("detects document changes", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      // First update
      await dashboardService.checkForUpdates();
      expect(callback).toHaveBeenCalledTimes(1);

      // Add new document
      documentService.getUserDocuments.mockResolvedValue([
        ...mockDocuments,
        {
          id: "doc2",
          projectName: "Solar Project",
          status: "pending",
          estimatedCredits: 500,
          createdAt: "2024-01-15T10:00:00Z",
        },
      ]);

      // Second update
      await dashboardService.checkForUpdates();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("detects document status changes", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      // First update
      await dashboardService.checkForUpdates();
      expect(callback).toHaveBeenCalledTimes(1);

      // Change document status
      documentService.getUserDocuments.mockResolvedValue([
        {
          ...mockDocuments[0],
          status: "attested", // Changed from 'minted'
        },
      ]);

      // Second update
      await dashboardService.checkForUpdates();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("detects allocation changes", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      // First update
      await dashboardService.checkForUpdates();
      expect(callback).toHaveBeenCalledTimes(1);

      // Add new allocation
      creditAllocationService.getUserAllocations.mockResolvedValue([
        {
          id: "alloc1",
          amount: 500,
          status: "completed",
          createdAt: "2024-01-15T10:00:00Z",
        },
      ]);

      creditAllocationService.getUserBalanceInfo.mockResolvedValue({
        ...mockBalanceInfo,
        recentAllocations: [
          {
            id: "alloc1",
            amount: 500,
            status: "completed",
            createdAt: "2024-01-15T10:00:00Z",
          },
        ],
      });

      // Second update
      await dashboardService.checkForUpdates();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("does not trigger update when no changes detected", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      // First update
      await dashboardService.checkForUpdates();
      expect(callback).toHaveBeenCalledTimes(1);

      // Second update with same data
      await dashboardService.checkForUpdates();
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe("Polling", () => {
    it("polls at regular intervals", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      // Initial call
      expect(callback).toHaveBeenCalledTimes(1);

      // Advance time by 30 seconds
      vi.advanceTimersByTime(30000);
      await vi.runAllTimersAsync();

      expect(callback).toHaveBeenCalledTimes(1); // No change, so no additional call

      // Change data and advance time again
      creditAllocationService.getUserBalanceInfo.mockResolvedValue({
        ...mockBalanceInfo,
        currentBalance: 2000,
      });

      vi.advanceTimersByTime(30000);
      await vi.runAllTimersAsync();

      expect(callback).toHaveBeenCalledTimes(2); // Should be called due to change
    });

    it("allows custom polling interval", () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      // Set custom interval (10 seconds)
      dashboardService.setPollingInterval(10000);

      // Advance time by 10 seconds
      vi.advanceTimersByTime(10000);

      // Should have attempted to check for updates
      expect(creditAllocationService.getUserBalanceInfo).toHaveBeenCalledTimes(
        2
      );
    });
  });

  describe("Force Refresh", () => {
    it("forces data refresh", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      // Initial load
      expect(callback).toHaveBeenCalledTimes(1);

      // Force refresh
      await dashboardService.forceRefresh();

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("clears cached data on force refresh", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      // Get cached data
      const cachedData = dashboardService.getCachedData();
      expect(cachedData).toBeTruthy();

      // Force refresh should update cached data
      creditAllocationService.getUserBalanceInfo.mockResolvedValue({
        ...mockBalanceInfo,
        currentBalance: 2000,
      });

      await dashboardService.forceRefresh();

      const newCachedData = dashboardService.getCachedData();
      expect(newCachedData.balance.currentBalance).toBe(2000);
    });

    it("throws error when user not authenticated", async () => {
      authService.getCurrentUser.mockReturnValue(null);

      await expect(dashboardService.forceRefresh()).rejects.toThrow(
        "User not authenticated"
      );
    });
  });

  describe("Dashboard Summary", () => {
    it("returns dashboard summary", async () => {
      const summary = await dashboardService.getDashboardSummary();

      expect(summary).toEqual({
        currentBalance: mockBalanceInfo.currentBalance,
        totalAllocated: mockBalanceInfo.totalAllocated,
        totalDocuments: mockDocumentStats.total,
        pendingDocuments: mockDocumentStats.pending,
        verificationRate: 100, // 1 minted out of 1 total
      });
    });

    it("returns null when user not authenticated", async () => {
      authService.getCurrentUser.mockReturnValue(null);

      const summary = await dashboardService.getDashboardSummary();
      expect(summary).toBeNull();
    });

    it("handles service errors", async () => {
      creditAllocationService.getUserBalanceInfo.mockRejectedValue(
        new Error("Service error")
      );

      const summary = await dashboardService.getDashboardSummary();
      expect(summary).toBeNull();
    });
  });

  describe("Cached Data", () => {
    it("returns cached data", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      await dashboardService.checkForUpdates();

      const cachedData = dashboardService.getCachedData();
      expect(cachedData).toEqual(
        expect.objectContaining({
          user: mockUser,
          balance: mockBalanceInfo,
          documents: mockDocuments,
        })
      );
    });

    it("returns null when no cached data", () => {
      const cachedData = dashboardService.getCachedData();
      expect(cachedData).toBeNull();
    });

    it("tracks last update time", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      expect(dashboardService.getLastUpdateTime()).toBeNull();

      await dashboardService.checkForUpdates();

      const lastUpdateTime = dashboardService.getLastUpdateTime();
      expect(lastUpdateTime).toBeTruthy();
      expect(new Date(lastUpdateTime)).toBeInstanceOf(Date);
    });
  });

  describe("Cleanup", () => {
    it("cleans up resources", () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      expect(dashboardService.isPollingActive()).toBe(true);

      dashboardService.cleanup();

      expect(dashboardService.isPollingActive()).toBe(false);
      expect(dashboardService.getCachedData()).toBeNull();
      expect(dashboardService.getLastUpdateTime()).toBeNull();
    });
  });

  describe("Notification System", () => {
    it("shows notifications for new allocations", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      // First update with no allocations
      await dashboardService.checkForUpdates();

      // Second update with new allocation
      const newAllocation = {
        id: "alloc1",
        amount: 500,
        status: "completed",
        documentName: "Solar Project",
        createdAt: "2024-01-15T10:00:00Z",
      };

      creditAllocationService.getUserAllocations.mockResolvedValue([
        newAllocation,
      ]);
      creditAllocationService.getUserBalanceInfo.mockResolvedValue({
        ...mockBalanceInfo,
        recentAllocations: [newAllocation],
      });

      await dashboardService.checkForUpdates();

      // Should trigger notification (mocked toast.success would be called)
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("shows notifications for document status changes", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      // First update with pending document
      documentService.getUserDocuments.mockResolvedValue([
        {
          ...mockDocuments[0],
          status: "pending",
        },
      ]);

      await dashboardService.checkForUpdates();

      // Second update with attested document
      documentService.getUserDocuments.mockResolvedValue([
        {
          ...mockDocuments[0],
          status: "attested",
        },
      ]);

      await dashboardService.checkForUpdates();

      // Should trigger notification for status change
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("shows notifications for balance increases", async () => {
      const callback = vi.fn();
      dashboardService.subscribe(callback);

      // First update
      await dashboardService.checkForUpdates();

      // Second update with increased balance
      creditAllocationService.getUserBalanceInfo.mockResolvedValue({
        ...mockBalanceInfo,
        currentBalance: 2000, // Increased from 1500
      });

      await dashboardService.checkForUpdates();

      // Should trigger notification for balance increase
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});
