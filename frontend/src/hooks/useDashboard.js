import { useState, useEffect, useCallback, useRef } from "react";
import dashboardService from "../services/dashboardService.js";
import authService from "../services/auth.js";

/**
 * Custom hook for dashboard data management with real-time updates
 * @param {Object} options - Hook options
 * @returns {Object} Dashboard state and methods
 */
export function useDashboard(options = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableNotifications = true,
  } = options;

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const unsubscribeRef = useRef(null);
  const mountedRef = useRef(true);

  /**
   * Handle dashboard data updates
   */
  const handleDataUpdate = useCallback((newData) => {
    if (!mountedRef.current) return;

    console.log("📊 Dashboard data updated via hook");
    setDashboardData(newData);
    setLastUpdated(new Date().toISOString());
    setLoading(false);
    setRefreshing(false);
    setError(null);
  }, []);

  /**
   * Load initial dashboard data
   */
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = authService.getCurrentUser();
      if (!currentUser?.walletAddress) {
        setDashboardData(null);
        setLoading(false);
        return;
      }

      // Check if we have cached data
      const cachedData = dashboardService.getCachedData();
      if (cachedData) {
        setDashboardData(cachedData);
        setLastUpdated(dashboardService.getLastUpdateTime());
        setLoading(false);
      }

      // Force refresh to get latest data
      await dashboardService.forceRefresh();
    } catch (err) {
      console.error("❌ Failed to load initial dashboard data:", err);
      if (mountedRef.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, []);

  /**
   * Manually refresh dashboard data
   */
  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      await dashboardService.forceRefresh();
    } catch (err) {
      console.error("❌ Failed to refresh dashboard data:", err);
      if (mountedRef.current) {
        setError(err.message);
        setRefreshing(false);
      }
    }
  }, []);

  /**
   * Get dashboard summary
   */
  const getSummary = useCallback(async () => {
    try {
      return await dashboardService.getDashboardSummary();
    } catch (err) {
      console.error("❌ Failed to get dashboard summary:", err);
      return null;
    }
  }, []);

  // Set up dashboard service subscription
  useEffect(() => {
    if (!autoRefresh) return;

    console.log("📊 Setting up dashboard subscription...");

    // Subscribe to updates
    unsubscribeRef.current = dashboardService.subscribe(handleDataUpdate);

    // Set polling interval if specified
    if (refreshInterval !== 30000) {
      dashboardService.setPollingInterval(refreshInterval);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, handleDataUpdate]);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Calculate derived state
  const isPolling = dashboardService.isPollingActive();
  const hasData = dashboardData !== null;
  const isEmpty =
    hasData &&
    dashboardData.documents.length === 0 &&
    dashboardData.allocations.length === 0;

  return {
    // Data
    data: dashboardData,
    loading,
    error,
    refreshing,
    lastUpdated,

    // State flags
    isPolling,
    hasData,
    isEmpty,

    // Methods
    refresh,
    getSummary,

    // Convenience accessors
    balance: dashboardData?.balance || null,
    documents: dashboardData?.documents || [],
    allocations: dashboardData?.allocations || [],
    tokens: dashboardData?.tokens || [],
    documentStats: dashboardData?.documentStats || {
      total: 0,
      pending: 0,
      attested: 0,
      minted: 0,
      rejected: 0,
    },
  };
}

/**
 * Hook for dashboard metrics only (lighter weight)
 * @returns {Object} Dashboard metrics
 */
export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const summary = await dashboardService.getDashboardSummary();
      setMetrics(summary);
    } catch (error) {
      console.error("❌ Failed to load dashboard metrics:", error);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();

    // Refresh metrics every 2 minutes
    const interval = setInterval(loadMetrics, 120000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  return {
    metrics,
    loading,
    refresh: loadMetrics,
  };
}

/**
 * Hook for real-time balance updates
 * @returns {Object} Balance information and updates
 */
export function useBalanceUpdates() {
  const [balance, setBalance] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const unsubscribe = dashboardService.subscribe((data) => {
      if (data.balance) {
        setBalance(data.balance);
        setLastUpdate(new Date().toISOString());
      }
    });

    return unsubscribe;
  }, []);

  return {
    balance,
    lastUpdate,
  };
}

/**
 * Hook for document status updates
 * @returns {Object} Document information and updates
 */
export function useDocumentUpdates() {
  const [documents, setDocuments] = useState([]);
  const [documentStats, setDocumentStats] = useState({
    total: 0,
    pending: 0,
    attested: 0,
    minted: 0,
    rejected: 0,
  });
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const unsubscribe = dashboardService.subscribe((data) => {
      if (data.documents && data.documentStats) {
        setDocuments(data.documents);
        setDocumentStats(data.documentStats);
        setLastUpdate(new Date().toISOString());
      }
    });

    return unsubscribe;
  }, []);

  return {
    documents,
    documentStats,
    lastUpdate,
  };
}

export default useDashboard;
