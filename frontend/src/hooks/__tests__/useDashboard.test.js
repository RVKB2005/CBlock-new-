import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  useDashboard,
  useDashboardMetrics,
  useBalanceUpdates,
  useDocumentUpdates,
} from "../useDashboard.js";
import dashboardService from "../../services/dashboardService.js";
import authService from "../../services/auth.js";

// Mock dependencies
vi.mock("../../services/dashboardService.js");
vi.mock("../../services/auth.js");

describe("useDashboard Hook", () => {
  const mockUser = {
    walletAddress: "0x1234567890123456789012345678901234567890",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    accountType: "individual",
  };

  const mockDashboardData = {
    user: mockUser,
    balance: {
      currentBalance: 1500,
      totalAllocated: 2000,
      totalAllocations: 5,
      recentAllocations: [],
      pendingAllocations: [],
    },
    documents: [
      {
        id: "doc1",
        projectName: "Wind Farm Project",
        status: "minted",
        estimatedCredits: 1000,
        createdAt: "2024-01-10T10:00:00Z",
      },
    ],
    documentStats: {
      total: 1,
      pending: 0,
      attested: 0,
      minted: 1,
      rejected: 0,
    },
    tokens: [
      {
        tokenId: 1,
        balance: 1000,
        gsProjectId: "GS001",
        gsSerial: "ABC123",
      },
    ],
    allocations: [],
    lastUpdated: "2024-01-15T10:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth service
    authService.getCurrentUser.mockReturnValue(mockUser);

    // Mock dashboard service
    dashboardService.subscribe.mockImplementation((callback) => {
      // Simulate immediate data update
      setTimeout(() => callback(mockDashboardData), 0);
      return vi.fn(); // Return unsubscribe function
    });
    dashboardService.getCachedData.mockReturnValue(null);
    dashboardService.getLastUpdateTime.mockReturnValue(null);
    dashboardService.forceRefresh.mockResolvedValue(mockDashboardData);
    dashboardService.getDashboardSummary.mockResolvedValue({
      currentBalance: 1500,
      totalAllocated: 2000,
      totalDocuments: 1,
      pendingDocuments: 0,
      verificationRate: 100,
    });
    dashboardService.isPollingActive.mockReturnValue(true);
    dashboardService.setPollingInterval.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useDashboard", () => {
    it("initializes with loading state", () => {
      const { result } = renderHook(() => useDashboard());

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("subscribes to dashboard service on mount", () => {
      renderHook(() => useDashboard());

      expect(dashboardService.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it("loads initial data on mount", async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(dashboardService.forceRefresh).toHaveBeenCalled();
    });

    it("updates data when dashboard service notifies", async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.data).toEqual(mockDashboardData);
        expect(result.current.loading).toBe(false);
      });
    });

    it("provides convenience accessors", async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.balance).toEqual(mockDashboardData.balance);
        expect(result.current.documents).toEqual(mockDashboardData.documents);
        expect(result.current.allocations).toEqual(
          mockDashboardData.allocations
        );
        expect(result.current.tokens).toEqual(mockDashboardData.tokens);
        expect(result.current.documentStats).toEqual(
          mockDashboardData.documentStats
        );
      });
    });

    it("handles refresh correctly", async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.refresh();
      });

      expect(result.current.refreshing).toBe(true);
      expect(dashboardService.forceRefresh).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
    });

    it("handles getSummary correctly", async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const summary = await act(async () => {
        return await result.current.getSummary();
      });

      expect(summary).toEqual({
        currentBalance: 1500,
        totalAllocated: 2000,
        totalDocuments: 1,
        pendingDocuments: 0,
        verificationRate: 100,
      });
    });

    it("sets custom polling interval", () => {
      renderHook(() => useDashboard({ refreshInterval: 60000 }));

      expect(dashboardService.setPollingInterval).toHaveBeenCalledWith(60000);
    });

    it("skips auto-refresh when disabled", () => {
      renderHook(() => useDashboard({ autoRefresh: false }));

      expect(dashboardService.subscribe).not.toHaveBeenCalled();
    });

    it("handles user without wallet address", () => {
      authService.getCurrentUser.mockReturnValue({
        ...mockUser,
        walletAddress: null,
      });

      const { result } = renderHook(() => useDashboard());

      expect(result.current.data).toBeNull();
    });

    it("handles errors during initial load", async () => {
      const errorMessage = "Failed to load data";
      dashboardService.forceRefresh.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.loading).toBe(false);
      });
    });

    it("handles errors during refresh", async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const errorMessage = "Refresh failed";
      dashboardService.forceRefresh.mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.refreshing).toBe(false);
    });

    it("calculates state flags correctly", async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.hasData).toBe(true);
        expect(result.current.isEmpty).toBe(false); // Has documents
        expect(result.current.isPolling).toBe(true);
      });
    });

    it("calculates isEmpty correctly when no data", async () => {
      const emptyData = {
        ...mockDashboardData,
        documents: [],
        allocations: [],
      };

      dashboardService.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback(emptyData), 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isEmpty).toBe(true);
      });
    });

    it("unsubscribes on unmount", () => {
      const unsubscribeMock = vi.fn();
      dashboardService.subscribe.mockReturnValue(unsubscribeMock);

      const { unmount } = renderHook(() => useDashboard());

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it("uses cached data when available", () => {
      dashboardService.getCachedData.mockReturnValue(mockDashboardData);
      dashboardService.getLastUpdateTime.mockReturnValue(
        "2024-01-15T10:00:00Z"
      );

      const { result } = renderHook(() => useDashboard());

      // Should immediately have cached data
      expect(result.current.data).toEqual(mockDashboardData);
      expect(result.current.lastUpdated).toBe("2024-01-15T10:00:00Z");
    });
  });

  describe("useDashboardMetrics", () => {
    it("loads metrics on mount", async () => {
      const { result } = renderHook(() => useDashboardMetrics());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.metrics).toEqual({
          currentBalance: 1500,
          totalAllocated: 2000,
          totalDocuments: 1,
          pendingDocuments: 0,
          verificationRate: 100,
        });
      });

      expect(dashboardService.getDashboardSummary).toHaveBeenCalled();
    });

    it("handles errors when loading metrics", async () => {
      dashboardService.getDashboardSummary.mockRejectedValue(
        new Error("Failed to load")
      );

      const { result } = renderHook(() => useDashboardMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.metrics).toBeNull();
      });
    });

    it("provides refresh function", async () => {
      const { result } = renderHook(() => useDashboardMetrics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.refresh();
      });

      expect(dashboardService.getDashboardSummary).toHaveBeenCalledTimes(2);
    });

    it("sets up periodic refresh", () => {
      vi.useFakeTimers();

      renderHook(() => useDashboardMetrics());

      expect(dashboardService.getDashboardSummary).toHaveBeenCalledTimes(1);

      // Fast-forward 2 minutes
      act(() => {
        vi.advanceTimersByTime(120000);
      });

      expect(dashboardService.getDashboardSummary).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe("useBalanceUpdates", () => {
    it("subscribes to balance updates", () => {
      renderHook(() => useBalanceUpdates());

      expect(dashboardService.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it("updates balance when data changes", async () => {
      const { result } = renderHook(() => useBalanceUpdates());

      await waitFor(() => {
        expect(result.current.balance).toEqual(mockDashboardData.balance);
        expect(result.current.lastUpdate).toBeTruthy();
      });
    });

    it("handles data without balance", async () => {
      dashboardService.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback({ ...mockDashboardData, balance: null }), 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useBalanceUpdates());

      await waitFor(() => {
        expect(result.current.balance).toBeNull();
      });
    });
  });

  describe("useDocumentUpdates", () => {
    it("subscribes to document updates", () => {
      renderHook(() => useDocumentUpdates());

      expect(dashboardService.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it("updates documents when data changes", async () => {
      const { result } = renderHook(() => useDocumentUpdates());

      await waitFor(() => {
        expect(result.current.documents).toEqual(mockDashboardData.documents);
        expect(result.current.documentStats).toEqual(
          mockDashboardData.documentStats
        );
        expect(result.current.lastUpdate).toBeTruthy();
      });
    });

    it("handles data without documents", async () => {
      dashboardService.subscribe.mockImplementation((callback) => {
        setTimeout(
          () =>
            callback({
              ...mockDashboardData,
              documents: null,
              documentStats: null,
            }),
          0
        );
        return vi.fn();
      });

      const { result } = renderHook(() => useDocumentUpdates());

      // Should not update when documents/stats are null
      expect(result.current.documents).toEqual([]);
      expect(result.current.documentStats).toEqual({
        total: 0,
        pending: 0,
        attested: 0,
        minted: 0,
        rejected: 0,
      });
    });
  });

  describe("Hook Cleanup", () => {
    it("cleans up subscriptions on unmount", () => {
      const unsubscribeMock = vi.fn();
      dashboardService.subscribe.mockReturnValue(unsubscribeMock);

      const { unmount } = renderHook(() => useDashboard());
      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it("cleans up balance subscription on unmount", () => {
      const unsubscribeMock = vi.fn();
      dashboardService.subscribe.mockReturnValue(unsubscribeMock);

      const { unmount } = renderHook(() => useBalanceUpdates());
      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it("cleans up document subscription on unmount", () => {
      const unsubscribeMock = vi.fn();
      dashboardService.subscribe.mockReturnValue(unsubscribeMock);

      const { unmount } = renderHook(() => useDocumentUpdates());
      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it("cleans up metrics interval on unmount", () => {
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const { unmount } = renderHook(() => useDashboardMetrics());
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("Error Handling", () => {
    it("handles subscription callback errors", async () => {
      dashboardService.subscribe.mockImplementation((callback) => {
        // Simulate error in callback
        setTimeout(() => {
          try {
            callback(mockDashboardData);
          } catch (error) {
            // Error should be handled gracefully
          }
        }, 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useDashboard());

      // Should not crash the hook
      await waitFor(() => {
        expect(result.current.data).toEqual(mockDashboardData);
      });
    });

    it("handles getSummary errors", async () => {
      dashboardService.getDashboardSummary.mockRejectedValue(
        new Error("Summary error")
      );

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const summary = await act(async () => {
        return await result.current.getSummary();
      });

      expect(summary).toBeNull();
    });
  });
});
