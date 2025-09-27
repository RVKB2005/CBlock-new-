import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CurrencyDollarIcon,
    ArrowPathIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    EyeIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import creditAllocationService from '../services/creditAllocation.js';
import authService from '../services/auth.js';

/**
 * User Balance Card Component
 * Displays user's credit balance, allocation history, and real-time updates
 */
export default function UserBalanceCard({ className = '', showDetails = false }) {
    const [balanceInfo, setBalanceInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAllocationHistory, setShowAllocationHistory] = useState(showDetails);
    const [refreshing, setRefreshing] = useState(false);

    /**
     * Load user balance information
     */
    const loadBalanceInfo = useCallback(async () => {
        try {
            setError(null);

            const currentUser = authService.getCurrentUser();
            if (!currentUser?.walletAddress) {
                setBalanceInfo(null);
                return;
            }

            console.log('💰 Loading user balance info...');
            const info = await creditAllocationService.getUserBalanceInfo(currentUser.walletAddress);
            setBalanceInfo(info);

        } catch (err) {
            console.error('❌ Failed to load balance info:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    /**
     * Refresh balance information
     */
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadBalanceInfo();
    }, [loadBalanceInfo]);

    /**
     * Retry failed allocation
     */
    const handleRetryAllocation = useCallback(async (allocationId) => {
        try {
            console.log('🔄 Retrying allocation:', allocationId);
            toast.loading('Retrying credit allocation...', { id: 'retry-allocation' });

            const result = await creditAllocationService.retryFailedAllocation(allocationId);
            toast.dismiss('retry-allocation');

            if (result.success) {
                toast.success('Credit allocation retry successful!');
                await loadBalanceInfo(); // Refresh data
            } else {
                toast.error('Credit allocation retry failed');
            }
        } catch (error) {
            toast.dismiss('retry-allocation');
            toast.error(`Retry failed: ${error.message}`);
        }
    }, [loadBalanceInfo]);

    // Load balance info on component mount and user change
    useEffect(() => {
        loadBalanceInfo();
    }, [loadBalanceInfo]);

    // Set up periodic refresh for real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading && !refreshing) {
                loadBalanceInfo();
            }
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [loading, refreshing, loadBalanceInfo]);

    // Don't render if user is not authenticated
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
        return null;
    }

    // Loading state
    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl shadow-sm border border-carbon-200 p-6 ${className}`}
            >
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-6 h-6 text-primary-500 animate-spin" />
                    <span className="ml-2 text-carbon-600">Loading balance...</span>
                </div>
            </motion.div>
        );
    }

    // Error state
    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl shadow-sm border border-red-200 p-6 ${className}`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        <span className="text-red-700 font-medium">Error loading balance</span>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="text-red-600 hover:text-red-700 underline text-sm"
                    >
                        Try again
                    </button>
                </div>
                <p className="text-red-600 text-sm mt-2">{error}</p>
            </motion.div>
        );
    }

    // No balance info available
    if (!balanceInfo) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl shadow-sm border border-carbon-200 p-6 ${className}`}
            >
                <div className="text-center py-4">
                    <CurrencyDollarIcon className="w-8 h-8 text-carbon-400 mx-auto mb-2" />
                    <p className="text-carbon-600">No balance information available</p>
                    <p className="text-carbon-500 text-sm">Connect your wallet to view credits</p>
                </div>
            </motion.div>
        );
    }

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-US').format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Invalid date';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-xl shadow-sm border border-carbon-200 ${className}`}
        >
            {/* Header */}
            <div className="p-6 border-b border-carbon-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary-100 rounded-lg">
                            <CurrencyDollarIcon className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-carbon-900">Credit Balance</h3>
                            <p className="text-sm text-carbon-600">Your carbon credit portfolio</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 text-carbon-400 hover:text-carbon-600 hover:bg-carbon-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Balance Summary */}
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Current Balance */}
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm font-medium text-green-900 mb-1">Current Balance</p>
                        <p className="text-2xl font-bold text-green-700">
                            {formatAmount(balanceInfo.currentBalance)}
                        </p>
                        <p className="text-xs text-green-600">Credits available</p>
                    </div>

                    {/* Total Allocated */}
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-1">Total Allocated</p>
                        <p className="text-2xl font-bold text-blue-700">
                            {formatAmount(balanceInfo.totalAllocated)}
                        </p>
                        <p className="text-xs text-blue-600">Lifetime earnings</p>
                    </div>

                    {/* Total Allocations */}
                    <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm font-medium text-purple-900 mb-1">Allocations</p>
                        <p className="text-2xl font-bold text-purple-700">
                            {balanceInfo.totalAllocations}
                        </p>
                        <p className="text-xs text-purple-600">Documents verified</p>
                    </div>
                </div>

                {/* Pending Allocations Alert */}
                {balanceInfo.pendingAllocations.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4"
                    >
                        <div className="flex items-center space-x-2">
                            <ClockIcon className="w-5 h-5 text-yellow-600" />
                            <p className="text-yellow-800 font-medium">
                                {balanceInfo.pendingAllocations.length} pending allocation{balanceInfo.pendingAllocations.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <p className="text-yellow-700 text-sm mt-1">
                            Some credit allocations are still being processed or need retry.
                        </p>
                    </motion.div>
                )}

                {/* Allocation History Toggle */}
                {balanceInfo.recentAllocations.length > 0 && (
                    <div className="border-t border-carbon-200 pt-4">
                        <button
                            onClick={() => setShowAllocationHistory(!showAllocationHistory)}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <span className="text-sm font-medium text-carbon-900">
                                Recent Allocations ({balanceInfo.recentAllocations.length})
                            </span>
                            {showAllocationHistory ? (
                                <ChevronUpIcon className="w-4 h-4 text-carbon-500" />
                            ) : (
                                <ChevronDownIcon className="w-4 h-4 text-carbon-500" />
                            )}
                        </button>

                        <AnimatePresence>
                            {showAllocationHistory && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 space-y-3"
                                >
                                    {balanceInfo.recentAllocations.map((allocation) => (
                                        <AllocationItem
                                            key={allocation.id}
                                            allocation={allocation}
                                            onRetry={handleRetryAllocation}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* No Allocations Message */}
                {balanceInfo.totalAllocations === 0 && (
                    <div className="text-center py-6 border-t border-carbon-200">
                        <InformationCircleIcon className="w-8 h-8 text-carbon-400 mx-auto mb-2" />
                        <p className="text-carbon-600 font-medium">No credit allocations yet</p>
                        <p className="text-carbon-500 text-sm">
                            Upload documents for verification to start earning credits
                        </p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/**
 * Individual Allocation Item Component
 */
function AllocationItem({ allocation, onRetry }) {
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
            case 'failed':
                return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
            case 'pending':
            case 'retrying':
                return <ClockIcon className="w-4 h-4 text-yellow-500" />;
            default:
                return <InformationCircleIcon className="w-4 h-4 text-carbon-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'text-green-700 bg-green-50 border-green-200';
            case 'failed':
                return 'text-red-700 bg-red-50 border-red-200';
            case 'pending':
            case 'retrying':
                return 'text-yellow-700 bg-yellow-50 border-yellow-200';
            default:
                return 'text-carbon-700 bg-carbon-50 border-carbon-200';
        }
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-US').format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Invalid date';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-3 rounded-lg border ${getStatusColor(allocation.status)}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    {getStatusIcon(allocation.status)}
                    <div>
                        <p className="text-sm font-medium">
                            {formatAmount(allocation.amount)} credits
                        </p>
                        <p className="text-xs opacity-75">
                            {allocation.documentName || 'Unknown document'}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs opacity-75">
                        {formatDate(allocation.allocatedAt || allocation.createdAt)}
                    </p>
                    {allocation.status === 'failed' && allocation.needsRetry && (
                        <button
                            onClick={() => onRetry(allocation.id)}
                            className="text-xs text-red-600 hover:text-red-700 underline mt-1"
                        >
                            Retry
                        </button>
                    )}
                </div>
            </div>

            {allocation.transactionHash && (
                <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                    <p className="text-xs opacity-75 font-mono">
                        Tx: {allocation.transactionHash.slice(0, 10)}...{allocation.transactionHash.slice(-6)}
                    </p>
                </div>
            )}
        </motion.div>
    );
}