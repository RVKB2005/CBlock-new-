import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CurrencyDollarIcon,
    DocumentTextIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    ChartBarIcon,
    ArrowTrendingUpIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import authService from '../services/auth.js';
import creditAllocationService from '../services/creditAllocation.js';
import documentService from '../services/document.js';
import blockchainService from '../services/blockchain.js';
import UserBalanceCard from './UserBalanceCard.jsx';

/**
 * Enhanced User Dashboard Component
 * Provides comprehensive credit tracking, document status, and portfolio view
 */
export default function UserDashboard({ className = '', onPageChange }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    /**
     * Load comprehensive dashboard data
     */
    const loadDashboardData = useCallback(async () => {
        try {
            setError(null);

            const currentUser = authService.getCurrentUser();
            if (!currentUser?.walletAddress) {
                setDashboardData(null);
                return;
            }

            console.log('📊 Loading user dashboard data...');

            // Load data in parallel for better performance
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
                blockchainService.getUserTokens(currentUser.walletAddress).catch(() => []),
                creditAllocationService.getUserAllocations(currentUser.walletAddress).catch(() => []),
            ]);

            // Calculate portfolio metrics
            const portfolioMetrics = calculatePortfolioMetrics(
                userDocuments,
                allocationHistory,
                blockchainTokens
            );

            // Prepare dashboard data
            const data = {
                user: currentUser,
                balance: balanceInfo,
                documents: userDocuments,
                documentStats,
                tokens: blockchainTokens,
                allocations: allocationHistory,
                portfolio: portfolioMetrics,
                lastUpdated: new Date().toISOString(),
            };

            setDashboardData(data);
            console.log('✅ Dashboard data loaded successfully');

        } catch (err) {
            console.error('❌ Failed to load dashboard data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    /**
     * Calculate portfolio metrics from user data
     */
    const calculatePortfolioMetrics = (documents, allocations, tokens) => {
        const totalDocuments = documents.length;
        const pendingDocuments = documents.filter(doc => doc.status === 'pending').length;
        const attestedDocuments = documents.filter(doc => doc.status === 'attested').length;
        const mintedDocuments = documents.filter(doc => doc.status === 'minted').length;
        const rejectedDocuments = documents.filter(doc => doc.status === 'rejected').length;

        const totalCreditsEarned = allocations
            .filter(alloc => alloc.status === 'completed')
            .reduce((sum, alloc) => sum + (alloc.amount || 0), 0);

        const currentBalance = tokens.reduce((sum, token) => sum + token.balance, 0);

        const verificationRate = totalDocuments > 0
            ? ((attestedDocuments + mintedDocuments) / totalDocuments) * 100
            : 0;

        const avgCreditsPerDocument = mintedDocuments > 0
            ? totalCreditsEarned / mintedDocuments
            : 0;

        // Calculate recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentDocuments = documents.filter(doc =>
            new Date(doc.createdAt) > thirtyDaysAgo
        ).length;

        const recentAllocations = allocations.filter(alloc =>
            new Date(alloc.createdAt) > thirtyDaysAgo
        ).length;

        return {
            totalDocuments,
            pendingDocuments,
            attestedDocuments,
            mintedDocuments,
            rejectedDocuments,
            totalCreditsEarned,
            currentBalance,
            verificationRate,
            avgCreditsPerDocument,
            recentDocuments,
            recentAllocations,
        };
    };

    /**
     * Refresh dashboard data
     */
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadDashboardData();
    }, [loadDashboardData]);

    // Load dashboard data on component mount
    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // Set up periodic refresh for real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading && !refreshing) {
                loadDashboardData();
            }
        }, 60000); // Refresh every minute

        return () => clearInterval(interval);
    }, [loading, refreshing, loadDashboardData]);

    // Don't render if user is not authenticated
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <div className="text-center py-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                        <CurrencyDollarIcon className="w-10 h-10 text-primary-600" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-carbon-900 mb-4">Please Log In</h2>
                    <p className="text-carbon-600">
                        Log in to view your credit dashboard and document portfolio.
                    </p>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="animate-pulse space-y-8">
                    <div className="h-8 bg-carbon-200 rounded w-64"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-32 bg-carbon-100 rounded-lg"></div>
                        ))}
                    </div>
                    <div className="h-96 bg-carbon-100 rounded-lg"></div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-lg p-6"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                            <span className="text-red-700 font-medium">Error loading dashboard</span>
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
            </div>
        );
    }

    // No data available
    if (!dashboardData) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <div className="text-center py-20">
                    <InformationCircleIcon className="w-16 h-16 text-carbon-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-carbon-900 mb-2">No Data Available</h2>
                    <p className="text-carbon-600">
                        Connect your wallet and upload documents to start tracking your credits.
                    </p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', name: 'Overview', icon: ChartBarIcon },
        { id: 'documents', name: 'Documents', icon: DocumentTextIcon },
        { id: 'transactions', name: 'Transactions', icon: CurrencyDollarIcon },
        { id: 'portfolio', name: 'Portfolio', icon: ArrowTrendingUpIcon },
    ];

    return (
        <div className={`p-8 max-w-7xl mx-auto space-y-8 ${className}`}>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
            >
                <div>
                    <h1 className="text-3xl font-bold text-carbon-900">My Dashboard</h1>
                    <p className="text-carbon-600 mt-1">
                        Track your carbon credits, documents, and verification progress
                    </p>
                </div>
                <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 text-carbon-400 hover:text-carbon-600 hover:bg-carbon-100 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Refresh dashboard"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <span className="text-xs text-carbon-500">
                        Last updated: {new Date(dashboardData.lastUpdated).toLocaleTimeString()}
                    </span>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <QuickStatCard
                    title="Current Balance"
                    value={dashboardData.balance.currentBalance}
                    suffix="Credits"
                    icon={CurrencyDollarIcon}
                    color="from-green-500 to-green-600"
                    onClick={() => setActiveTab('transactions')}
                />
                <QuickStatCard
                    title="Total Documents"
                    value={dashboardData.portfolio.totalDocuments}
                    icon={DocumentTextIcon}
                    color="from-blue-500 to-blue-600"
                    onClick={() => setActiveTab('documents')}
                />
                <QuickStatCard
                    title="Credits Earned"
                    value={dashboardData.portfolio.totalCreditsEarned}
                    suffix="Total"
                    icon={ArrowTrendingUpIcon}
                    color="from-purple-500 to-purple-600"
                    onClick={() => setActiveTab('portfolio')}
                />
                <QuickStatCard
                    title="Verification Rate"
                    value={Math.round(dashboardData.portfolio.verificationRate)}
                    suffix="%"
                    icon={CheckCircleIcon}
                    color="from-orange-500 to-orange-600"
                    onClick={() => setActiveTab('portfolio')}
                />
            </div>

            {/* User Balance Card */}
            <UserBalanceCard showDetails={true} />

            {/* Tab Navigation */}
            <div className="border-b border-carbon-200">
                <nav className="flex space-x-8" role="tablist">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-carbon-500 hover:text-carbon-700 hover:border-carbon-300'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span>{tab.name}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'overview' && (
                        <OverviewTab
                            data={dashboardData}
                            onPageChange={onPageChange}
                        />
                    )}
                    {activeTab === 'documents' && (
                        <DocumentsTab
                            documents={dashboardData.documents}
                            stats={dashboardData.documentStats}
                            onPageChange={onPageChange}
                        />
                    )}
                    {activeTab === 'transactions' && (
                        <TransactionsTab
                            allocations={dashboardData.allocations}
                            balance={dashboardData.balance}
                        />
                    )}
                    {activeTab === 'portfolio' && (
                        <PortfolioTab
                            portfolio={dashboardData.portfolio}
                            documents={dashboardData.documents}
                            tokens={dashboardData.tokens}
                        />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

/**
 * Quick Stat Card Component
 */
function QuickStatCard({ title, value, suffix, icon: Icon, color, onClick }) {
    const formatValue = (val) => {
        if (typeof val === 'number') {
            return new Intl.NumberFormat('en-US').format(val);
        }
        return val || '0';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            onClick={onClick}
            className={`card cursor-pointer bg-gradient-to-br ${color} text-white`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-white/80 text-sm font-medium">{title}</p>
                    <p className="text-2xl font-bold">
                        {formatValue(value)}
                        {suffix && <span className="text-lg ml-1">{suffix}</span>}
                    </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </motion.div>
    );
}

/**
 * Overview Tab Component
 */
function OverviewTab({ data, onPageChange }) {
    const recentDocuments = data.documents.slice(0, 3);
    const recentAllocations = data.allocations.slice(0, 3);

    return (
        <div className="space-y-8">
            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Documents */}
                <div className="card">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-carbon-900">Recent Documents</h3>
                        <button
                            onClick={() => onPageChange?.('mint')}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                            Upload New
                        </button>
                    </div>
                    <div className="space-y-4">
                        {recentDocuments.length === 0 ? (
                            <div className="text-center py-8">
                                <DocumentTextIcon className="w-12 h-12 text-carbon-400 mx-auto mb-3" />
                                <p className="text-carbon-600">No documents uploaded yet</p>
                                <button
                                    onClick={() => onPageChange?.('mint')}
                                    className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2"
                                >
                                    Upload your first document
                                </button>
                            </div>
                        ) : (
                            recentDocuments.map((doc) => (
                                <DocumentItem key={doc.id} document={doc} />
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Credit Allocations */}
                <div className="card">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-carbon-900">Recent Credits</h3>
                        <button
                            onClick={() => onPageChange?.('tokens')}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                            View All
                        </button>
                    </div>
                    <div className="space-y-4">
                        {recentAllocations.length === 0 ? (
                            <div className="text-center py-8">
                                <CurrencyDollarIcon className="w-12 h-12 text-carbon-400 mx-auto mb-3" />
                                <p className="text-carbon-600">No credit allocations yet</p>
                                <p className="text-carbon-500 text-sm">
                                    Credits will appear here when your documents are verified
                                </p>
                            </div>
                        ) : (
                            recentAllocations.map((allocation) => (
                                <AllocationItem key={allocation.id} allocation={allocation} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h3 className="text-lg font-semibold text-carbon-900 mb-6">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuickActionButton
                        title="Upload Document"
                        description="Submit a new document for verification"
                        icon={DocumentTextIcon}
                        onClick={() => onPageChange?.('mint')}
                        color="bg-blue-50 text-blue-700 border-blue-200"
                    />
                    <QuickActionButton
                        title="View Tokens"
                        description="Check your carbon credit tokens"
                        icon={CurrencyDollarIcon}
                        onClick={() => onPageChange?.('tokens')}
                        color="bg-green-50 text-green-700 border-green-200"
                    />
                    <QuickActionButton
                        title="Marketplace"
                        description="Trade carbon credits"
                        icon={ChartBarIcon}
                        onClick={() => onPageChange?.('market')}
                        color="bg-purple-50 text-purple-700 border-purple-200"
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Quick Action Button Component
 */
function QuickActionButton({ title, description, icon: Icon, onClick, color }) {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${color} hover:shadow-md`}
        >
            <Icon className="w-8 h-8 mb-3" />
            <h4 className="font-semibold mb-1">{title}</h4>
            <p className="text-sm opacity-75">{description}</p>
        </motion.button>
    );
}

/**
 * Document Item Component
 */
function DocumentItem({ document }) {
    const getStatusIcon = (status) => {
        switch (status) {
            case 'minted':
                return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
            case 'attested':
                return <CheckCircleIcon className="w-4 h-4 text-blue-500" />;
            case 'pending':
                return <ClockIcon className="w-4 h-4 text-yellow-500" />;
            case 'rejected':
                return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
            default:
                return <DocumentTextIcon className="w-4 h-4 text-carbon-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'minted':
                return 'text-green-700 bg-green-50';
            case 'attested':
                return 'text-blue-700 bg-blue-50';
            case 'pending':
                return 'text-yellow-700 bg-yellow-50';
            case 'rejected':
                return 'text-red-700 bg-red-50';
            default:
                return 'text-carbon-700 bg-carbon-50';
        }
    };

    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return 'Unknown';
        }
    };

    return (
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-carbon-50 hover:bg-carbon-100 transition-colors">
            {getStatusIcon(document.status)}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-carbon-900 truncate">
                    {document.projectName || document.filename}
                </p>
                <p className="text-xs text-carbon-500">
                    {formatDate(document.createdAt)} • {document.estimatedCredits || 0} credits
                </p>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(document.status)}`}>
                {document.status}
            </span>
        </div>
    );
}

/**
 * Allocation Item Component
 */
function AllocationItem({ allocation }) {
    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-US').format(amount || 0);
    };

    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Unknown';
        }
    };

    return (
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                    +{formatAmount(allocation.amount)} credits allocated
                </p>
                <p className="text-xs text-green-700">
                    {allocation.documentName} • {formatDate(allocation.allocatedAt || allocation.createdAt)}
                </p>
            </div>
        </div>
    );
}

/**
 * Documents Tab Component - Simplified version
 */
function DocumentsTab({ documents, stats, onPageChange }) {
    return (
        <div className="space-y-6">
            <div className="card">
                <h3 className="text-lg font-semibold text-carbon-900 mb-6">Your Documents</h3>
                <div className="space-y-4">
                    {documents.length === 0 ? (
                        <div className="text-center py-12">
                            <DocumentTextIcon className="w-16 h-16 text-carbon-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-carbon-900 mb-2">No documents uploaded</h3>
                            <p className="text-carbon-600 mb-6">Upload your first document to start earning carbon credits</p>
                            <button onClick={() => onPageChange?.('mint')} className="btn-primary">
                                Upload Document
                            </button>
                        </div>
                    ) : (
                        documents.map((document) => (
                            <DocumentItem key={document.id} document={document} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Transactions Tab Component - Simplified version
 */
function TransactionsTab({ allocations, balance }) {
    return (
        <div className="space-y-6">
            <div className="card">
                <h3 className="text-lg font-semibold text-carbon-900 mb-6">Credit Transactions</h3>
                <div className="space-y-4">
                    {allocations.length === 0 ? (
                        <div className="text-center py-12">
                            <CurrencyDollarIcon className="w-16 h-16 text-carbon-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-carbon-900 mb-2">No transactions yet</h3>
                            <p className="text-carbon-600">Credit allocations will appear here when your documents are verified and minted.</p>
                        </div>
                    ) : (
                        allocations.map((allocation) => (
                            <AllocationItem key={allocation.id} allocation={allocation} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Portfolio Tab Component - Simplified version
 */
function PortfolioTab({ portfolio, documents, tokens }) {
    return (
        <div className="space-y-6">
            <div className="card">
                <h3 className="text-lg font-semibold text-carbon-900 mb-6">Portfolio Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-700">{portfolio.totalDocuments}</p>
                        <p className="text-sm text-blue-600">Total Documents</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-700">{Math.round(portfolio.verificationRate)}%</p>
                        <p className="text-sm text-green-600">Verification Rate</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-700">{new Intl.NumberFormat('en-US').format(portfolio.totalCreditsEarned)}</p>
                        <p className="text-sm text-purple-600">Credits Earned</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-700">{Math.round(portfolio.avgCreditsPerDocument)}</p>
                        <p className="text-sm text-orange-600">Avg Credits/Doc</p>
                    </div>
                </div>
            </div>
        </div>
    );
}