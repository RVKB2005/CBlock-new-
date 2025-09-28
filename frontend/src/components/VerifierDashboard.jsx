import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    DocumentTextIcon,
    UserIcon,
    BuildingOfficeIcon,
    CalendarIcon,
    EyeIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import documentService, { DOCUMENT_STATUS } from '../services/document.js';
import authService from '../services/auth.js';
import blockchainService from '../services/blockchain.js';
import errorHandler from '../services/errorHandler.js';
import toastNotifications from './ToastNotifications.jsx';
import retryService from '../services/retryService.js';
import { LoadingSpinner, DashboardLoading } from './LoadingStates.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import DocumentViewer from './DocumentViewer.jsx';

// Constants for pagination and filtering
const ITEMS_PER_PAGE = 10;
const FILTER_OPTIONS = {
    status: [
        { value: '', label: 'All Status' },
        { value: DOCUMENT_STATUS.PENDING, label: 'Pending' },
        { value: DOCUMENT_STATUS.ATTESTED, label: 'Attested' },
        { value: DOCUMENT_STATUS.MINTED, label: 'Minted' },
        { value: DOCUMENT_STATUS.REJECTED, label: 'Rejected' },
    ],
    uploaderType: [
        { value: '', label: 'All Users' },
        { value: 'individual', label: 'Individual Users' },
        { value: 'business', label: 'Business Users' },
    ],
};

export default function VerifierDashboard() {
    // State management
    const [documents, setDocuments] = useState([]);
    const [filteredDocuments, setFilteredDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [showDocumentDetails, setShowDocumentDetails] = useState(false);

    // Filter and search state
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [uploaderTypeFilter, setUploaderTypeFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Statistics state
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        attested: 0,
        minted: 0,
        rejected: 0,
    });

    /**
     * Load documents from the document service
     */
    const loadDocuments = useCallback(async () => {
        const currentUser = authService.getCurrentUser();
        const userRole = currentUser?.accountType || 'guest';

        try {
            setLoading(true);
            setError(null);

            // Check if user is authenticated and is a verifier
            if (!authService.isUserAuthenticated()) {
                const authError = new Error('Please log in to access the verifier dashboard');
                authError.code = 'USER_NOT_AUTHENTICATED';
                throw authError;
            }

            if (!authService.isVerifier()) {
                errorHandler.handlePermissionError(
                    'access verifier dashboard',
                    userRole,
                    { component: 'VerifierDashboard' }
                );
                return;
            }

            console.log('📋 Loading documents for verifier dashboard...');

            // Show loading notification for long operations
            const loadingToastId = toastNotifications.loading(
                'Loading documents for verification...',
                {
                    roleSpecific: true,
                    operation: 'document_review'
                }
            );

            try {
                // Fetch documents from service with retry logic
                const fetchedDocuments = await retryService.executeWithRetry(
                    () => documentService.getDocumentsForVerifier(),
                    {
                        maxRetries: 3,
                        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVER_ERROR']
                    }
                );

                console.log(`📋 Loaded ${fetchedDocuments.length} documents`);
                setDocuments(fetchedDocuments);

                // Calculate statistics
                const newStats = {
                    total: fetchedDocuments.length,
                    pending: fetchedDocuments.filter(doc => doc.status === DOCUMENT_STATUS.PENDING).length,
                    attested: fetchedDocuments.filter(doc => doc.status === DOCUMENT_STATUS.ATTESTED).length,
                    minted: fetchedDocuments.filter(doc => doc.status === DOCUMENT_STATUS.MINTED).length,
                    rejected: fetchedDocuments.filter(doc => doc.status === DOCUMENT_STATUS.REJECTED).length,
                };
                setStats(newStats);

                // Dismiss loading notification
                toastNotifications.dismiss(loadingToastId);

                // Show success notification if this is a refresh
                if (documents.length > 0) {
                    toastNotifications.success(
                        `Dashboard refreshed - ${fetchedDocuments.length} documents loaded`,
                        {
                            roleSpecific: true,
                            operation: 'dashboard_refresh',
                            duration: 3000
                        }
                    );
                }

            } catch (fetchError) {
                toastNotifications.dismiss(loadingToastId);
                throw fetchError;
            }

        } catch (err) {
            console.error('❌ Failed to load documents:', err);

            // Use enhanced error handler
            const processedError = errorHandler.handleError(err, {
                component: 'VerifierDashboard',
                operation: 'load_documents',
                userRole: 'verifier'
            }, {
                showToast: true,
                showRetry: true,
                retryAction: loadDocuments
            });

            setError(processedError.message.message || err.message);
        } finally {
            setLoading(false);
        }
    }, [documents.length]);

    /**
     * Apply filters and search to documents
     */
    const applyFilters = useCallback(() => {
        let filtered = [...documents];

        // Apply search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(doc =>
                doc.projectName?.toLowerCase().includes(search) ||
                doc.description?.toLowerCase().includes(search) ||
                doc.uploaderName?.toLowerCase().includes(search) ||
                doc.uploaderEmail?.toLowerCase().includes(search)
            );
        }

        // Apply status filter
        if (statusFilter) {
            filtered = filtered.filter(doc => doc.status === statusFilter);
        }

        // Apply uploader type filter
        if (uploaderTypeFilter) {
            filtered = filtered.filter(doc => doc.uploaderType === uploaderTypeFilter);
        }

        setFilteredDocuments(filtered);

        // Update pagination
        const newTotalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
        setTotalPages(newTotalPages);

        // Reset to first page if current page is out of bounds
        if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(1);
        }
    }, [documents, searchTerm, statusFilter, uploaderTypeFilter, currentPage]);

    /**
     * Get paginated documents for current page
     */
    const getPaginatedDocuments = useCallback(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredDocuments.slice(startIndex, endIndex);
    }, [filteredDocuments, currentPage]);

    /**
     * Handle document selection for details view
     */
    const handleDocumentSelect = useCallback((document) => {
        setSelectedDocument(document);
        setShowDocumentDetails(true);
    }, []);

    /**
     * Handle document details close
     */
    const handleCloseDetails = useCallback(() => {
        setShowDocumentDetails(false);
        setSelectedDocument(null);
    }, []);

    /**
     * Handle manual minting for attested documents
     */
    const handleMinting = useCallback(async (document) => {
        if (document.status !== DOCUMENT_STATUS.ATTESTED) {
            toast.error('Document must be attested before minting');
            return;
        }

        if (!document.attestation) {
            toast.error('Document attestation data is missing. Please re-attest this document.');
            console.error('❌ No attestation data found for document:', document.id);
            console.error('Document status is ATTESTED but attestation data is missing. This indicates a data corruption issue.');
            console.error('Document details:', document);

            // Suggest fixing the document status
            toast.error('This document appears to be corrupted. Please re-attest it or use the diagnostic tool to fix it.', {
                duration: 10000
            });
            return;
        }

        // Check for required attestation fields
        const requiredFields = ['signature', 'gsProjectId', 'gsSerial', 'amount', 'nonce'];
        const missingFields = requiredFields.filter(field => !document.attestation[field]);

        if (missingFields.length > 0) {
            toast.error(`Missing attestation data: ${missingFields.join(', ')}`);
            console.error('❌ Missing attestation fields:', missingFields, 'Available:', Object.keys(document.attestation));
            return;
        }

        try {
            console.log('🪙 Starting manual credit minting for document:', document.id);

            // Prepare attestation data for minting
            const attestationData = {
                gsProjectId: document.attestation.gsProjectId,
                gsSerial: document.attestation.gsSerial,
                ipfsCid: document.cid,
                amount: document.attestation.amount,
                recipient: document.uploadedBy,
                nonce: document.attestation.nonce,
                signature: document.attestation.signature
            };

            toast.loading('Minting credits...', { id: 'minting' });

            const mintingResult = await blockchainService.mintCarbonCreditsWithDocumentTracking(
                attestationData,
                document.id,
                document
            );

            console.log('✅ Credits minted successfully:', mintingResult);

            toast.success(`Credits minted and allocated to ${document.uploadedBy}!`, {
                id: 'minting',
                duration: 6000
            });

            // Update document with minting information
            await documentService.updateDocumentMinting(document.id, {
                transactionHash: mintingResult.receipt?.hash,
                mintedAt: new Date().toISOString(),
                mintedBy: await blockchainService.getCurrentAddress(),
                amount: attestationData.amount,
                recipient: attestationData.recipient,
                tokenId: mintingResult.tokenId
            });

            // Refresh documents
            await loadDocuments();

        } catch (error) {
            console.error('❌ Minting failed:', error);
            toast.error(`Minting failed: ${error.message}`, {
                id: 'minting',
                duration: 8000
            });
        }
    }, [loadDocuments]);

    /**
     * Handle resetting document to pending status
     */
    const handleResetToPending = useCallback(async (document) => {
        try {
            console.log('🔄 Resetting document to pending:', document.id);

            // Update document status to pending and remove attestation data
            await documentService.updateDocumentStatus(
                document.id,
                DOCUMENT_STATUS.PENDING,
                {
                    attestation: null, // Remove broken attestation data
                }
            );

            toast.success('Document reset to pending status. You can now re-attest it.');

            // Refresh the document list
            await loadDocuments();

        } catch (error) {
            console.error('❌ Failed to reset document:', error);
            toast.error(`Failed to reset document: ${error.message}`);
        }
    }, [loadDocuments]);

    /**
     * Refresh documents
     */
    const handleRefresh = useCallback(() => {
        loadDocuments();
    }, [loadDocuments]);

    /**
     * Clear all filters
     */
    const clearFilters = useCallback(() => {
        setSearchTerm('');
        setStatusFilter('');
        setUploaderTypeFilter('');
        setCurrentPage(1);
    }, []);

    // Load documents on component mount
    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    // Apply filters when dependencies change
    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    // Show loading state
    if (loading) {
        return (
            <ErrorBoundary componentName="VerifierDashboard">
                <DashboardLoading userRole="verifier" />
            </ErrorBoundary>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-carbon-900 mb-2">Error Loading Documents</h3>
                        <p className="text-carbon-600 mb-4">{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="btn-primary inline-flex items-center space-x-2"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            <span>Try Again</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary componentName="VerifierDashboard" context={{ userRole: 'verifier' }}>
            <div className="p-4 sm:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-carbon-900 mb-2">Verifier Dashboard</h1>
                            <p className="text-carbon-600">
                                Review and verify documents submitted by users for carbon credit minting
                            </p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="btn-secondary inline-flex items-center space-x-2"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            <span>Refresh</span>
                        </button>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <StatCard
                            title="Total Documents"
                            value={stats.total}
                            icon={DocumentTextIcon}
                            color="blue"
                        />
                        <StatCard
                            title="Pending"
                            value={stats.pending}
                            icon={ClockIcon}
                            color="yellow"
                        />
                        <StatCard
                            title="Attested"
                            value={stats.attested}
                            icon={CheckCircleIcon}
                            color="green"
                        />
                        <StatCard
                            title="Minted"
                            value={stats.minted}
                            icon={CheckCircleIcon}
                            color="emerald"
                        />
                        <StatCard
                            title="Rejected"
                            value={stats.rejected}
                            icon={XCircleIcon}
                            color="red"
                        />
                    </div>
                </motion.div>

                {/* Search and Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl shadow-sm border border-carbon-200 p-6 mb-6"
                >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                        {/* Search */}
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-carbon-400" />
                                <input
                                    type="text"
                                    placeholder="Search documents, projects, or uploaders..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-carbon-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                        </div>

                        {/* Filter Toggle */}
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${showFilters
                                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                                    : 'bg-white border-carbon-300 text-carbon-700 hover:bg-carbon-50'
                                    }`}
                            >
                                <FunnelIcon className="w-4 h-4" />
                                <span>Filters</span>
                            </button>

                            {(searchTerm || statusFilter || uploaderTypeFilter) && (
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-carbon-600 hover:text-carbon-900 underline"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Options */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-carbon-200"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Status Filter */}
                                    <div>
                                        <label htmlFor="status-filter" className="block text-sm font-medium text-carbon-700 mb-2">
                                            Status
                                        </label>
                                        <select
                                            id="status-filter"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-carbon-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            {FILTER_OPTIONS.status.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Uploader Type Filter */}
                                    <div>
                                        <label htmlFor="uploader-type-filter" className="block text-sm font-medium text-carbon-700 mb-2">
                                            Uploader Type
                                        </label>
                                        <select
                                            id="uploader-type-filter"
                                            value={uploaderTypeFilter}
                                            onChange={(e) => setUploaderTypeFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-carbon-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            {FILTER_OPTIONS.uploaderType.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Documents List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl shadow-sm border border-carbon-200"
                >
                    {filteredDocuments.length === 0 ? (
                        <div className="p-12 text-center">
                            <DocumentTextIcon className="w-12 h-12 text-carbon-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-carbon-900 mb-2">No Documents Found</h3>
                            <p className="text-carbon-600">
                                {documents.length === 0
                                    ? 'No documents have been uploaded yet.'
                                    : 'No documents match your current filters.'}
                            </p>
                            {(searchTerm || statusFilter || uploaderTypeFilter) && (
                                <button
                                    onClick={clearFilters}
                                    className="mt-4 text-primary-600 hover:text-primary-700 underline"
                                >
                                    Clear filters to see all documents
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Documents Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-carbon-50 border-b border-carbon-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-carbon-900">
                                                Project
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-carbon-900">
                                                Uploader
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-carbon-900">
                                                Status
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-carbon-900">
                                                Credits
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-carbon-900">
                                                Uploaded
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-carbon-900">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-carbon-200">
                                        {getPaginatedDocuments().map((document, index) => (
                                            <DocumentRow
                                                key={`${document.cid || document.id}-${index}`}
                                                document={document}
                                                index={index}
                                                onSelect={handleDocumentSelect}
                                                onMint={handleMinting}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="px-6 py-4 border-t border-carbon-200">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                        totalItems={filteredDocuments.length}
                                        itemsPerPage={ITEMS_PER_PAGE}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </motion.div>

                {/* Document Details Modal */}
                <AnimatePresence>
                    {showDocumentDetails && selectedDocument && (
                        <DocumentDetailsModal
                            document={selectedDocument}
                            onClose={handleCloseDetails}
                            onDocumentUpdate={loadDocuments}
                        />
                    )}
                </AnimatePresence>
            </div>
        </ErrorBoundary>
    );
}

/**
 * Statistics Card Component
 */
function StatCard({ title, value, icon: Icon, color }) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        red: 'bg-red-50 text-red-600 border-red-200',
    };

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className={`p-4 rounded-lg border ${colorClasses[color]}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium opacity-80">{title}</p>
                    <p className="text-2xl font-bold">{value}</p>
                </div>
                <Icon className="w-8 h-8 opacity-60" />
            </div>
        </motion.div>
    );
}

/**
 * Document Row Component
 */
function DocumentRow({ document, index, onSelect, onMint }) {
    const getStatusBadge = (status) => {
        const statusConfig = {
            [DOCUMENT_STATUS.PENDING]: {
                color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                icon: ClockIcon,
                label: 'Pending',
            },
            [DOCUMENT_STATUS.ATTESTED]: {
                color: 'bg-green-100 text-green-800 border-green-200',
                icon: CheckCircleIcon,
                label: 'Attested',
            },
            [DOCUMENT_STATUS.MINTED]: {
                color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                icon: CheckCircleIcon,
                label: 'Minted',
            },
            [DOCUMENT_STATUS.REJECTED]: {
                color: 'bg-red-100 text-red-800 border-red-200',
                icon: XCircleIcon,
                label: 'Rejected',
            },
        };

        const config = statusConfig[status] || statusConfig[DOCUMENT_STATUS.PENDING];
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                <Icon className="w-3 h-3" />
                <span>{config.label}</span>
            </span>
        );
    };

    const getUploaderIcon = (uploaderType) => {
        return uploaderType === 'business' ? BuildingOfficeIcon : UserIcon;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return 'Invalid date';
        }
    };

    const UploaderIcon = getUploaderIcon(document.uploaderType);

    return (
        <motion.tr
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="hover:bg-carbon-50 transition-colors"
        >
            <td className="px-6 py-4">
                <div>
                    <p className="font-semibold text-carbon-900 truncate max-w-48">
                        {document.projectName || 'Untitled Project'}
                    </p>
                    <p className="text-sm text-carbon-600 truncate max-w-48">
                        {document.filename || 'Unknown file'}
                    </p>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center space-x-2">
                    <UploaderIcon className="w-4 h-4 text-carbon-500" />
                    <div>
                        <p className="text-sm font-medium text-carbon-900">
                            {document.uploaderName || 'Unknown'}
                        </p>
                        <p className="text-xs text-carbon-600 capitalize">
                            {document.uploaderType || 'individual'}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                {getStatusBadge(document.status)}
            </td>
            <td className="px-6 py-4">
                <span className="text-sm font-medium text-carbon-900">
                    {document.estimatedCredits || 0} credits
                </span>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center space-x-1 text-sm text-carbon-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{formatDate(document.createdAt || document.uploadedAt)}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex space-x-2">
                    <button
                        onClick={() => onSelect(document)}
                        className="inline-flex items-center space-x-1 px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                        <EyeIcon className="w-4 h-4" />
                        <span>View</span>
                    </button>

                    {/* Quick Mint Button for Attested Documents */}
                    {document.status === DOCUMENT_STATUS.ATTESTED && onMint && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMint(document);
                            }}
                            className="inline-flex items-center space-x-1 px-3 py-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Mint Credits for this Document"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            <span>Mint</span>
                        </button>
                    )}
                </div>
            </td>
        </motion.tr>
    );
}

/**
 * Pagination Component
 */
function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, start + maxVisiblePages - 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-between">
            <div className="text-sm text-carbon-600">
                Showing {startItem} to {endItem} of {totalItems} documents
            </div>

            <div className="flex items-center space-x-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-carbon-300 text-carbon-600 hover:bg-carbon-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>

                {getPageNumbers().map(page => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${page === currentPage
                            ? 'bg-primary-500 text-white'
                            : 'text-carbon-600 hover:bg-carbon-50'
                            }`}
                    >
                        {page}
                    </button>
                ))}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-carbon-300 text-carbon-600 hover:bg-carbon-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

/**
 * Document Details Modal Component with Attestation Functionality
 */
function DocumentDetailsModal({ document, onClose, onDocumentUpdate }) {
    const [showAttestationForm, setShowAttestationForm] = useState(false);
    const [attestationData, setAttestationData] = useState({
        gsProjectId: '',
        gsSerial: '',
        amount: document.estimatedCredits || 0,
    });
    const [isAttesting, setIsAttesting] = useState(false);
    const [attestationError, setAttestationError] = useState(null);

    // Check if document can be attested
    const canAttest = document.status === DOCUMENT_STATUS.PENDING;
    const isAttested = document.status === DOCUMENT_STATUS.ATTESTED;
    const isMinted = document.status === DOCUMENT_STATUS.MINTED;
    const isRejected = document.status === DOCUMENT_STATUS.REJECTED;

    /**
     * Handle manual minting for attested documents
     */
    const handleMinting = async (document) => {
        if (document.status !== DOCUMENT_STATUS.ATTESTED) {
            toast.error('Document must be attested before minting');
            return;
        }

        if (!document.attestation) {
            toast.error('Document attestation data is missing. Please re-attest this document.');
            console.error('❌ No attestation data found for document:', document.id);
            console.error('Document status is ATTESTED but attestation data is missing. This indicates a data corruption issue.');
            console.error('Document details:', document);

            // Suggest fixing the document status
            toast.error('This document appears to be corrupted. Please re-attest it or use the diagnostic tool to fix it.', {
                duration: 10000
            });
            return;
        }

        // Check for required attestation fields
        const requiredFields = ['signature', 'gsProjectId', 'gsSerial', 'amount', 'nonce'];
        const missingFields = requiredFields.filter(field => !document.attestation[field]);

        if (missingFields.length > 0) {
            toast.error(`Missing attestation data: ${missingFields.join(', ')}`);
            console.error('❌ Missing attestation fields:', missingFields, 'Available:', Object.keys(document.attestation));
            return;
        }

        try {
            console.log('🪙 Starting manual credit minting for document:', document.id);

            // Prepare attestation data for minting
            const attestationData = {
                gsProjectId: document.attestation.gsProjectId,
                gsSerial: document.attestation.gsSerial,
                ipfsCid: document.cid,
                amount: document.attestation.amount,
                recipient: document.uploadedBy,
                nonce: document.attestation.nonce,
                signature: document.attestation.signature
            };

            toast.loading('Minting credits...', { id: 'minting' });

            const mintingResult = await blockchainService.mintCarbonCreditsWithDocumentTracking(
                attestationData,
                document.id,
                document
            );

            console.log('✅ Credits minted successfully:', mintingResult);

            toast.success(`Credits minted and allocated to ${document.uploadedBy}!`, {
                id: 'minting',
                duration: 6000
            });

            // Update document with minting information
            await documentService.updateDocumentMinting(document.id, {
                transactionHash: mintingResult.receipt?.hash,
                mintedAt: new Date().toISOString(),
                mintedBy: await blockchainService.getCurrentAddress(),
                amount: attestationData.amount,
                recipient: attestationData.recipient,
                tokenId: mintingResult.tokenId
            });

            // Refresh documents
            if (onDocumentUpdate) {
                onDocumentUpdate();
            }

        } catch (error) {
            console.error('❌ Minting failed:', error);
            toast.error(`Minting failed: ${error.message}`, {
                id: 'minting',
                duration: 8000
            });
        }
    };

    /**
     * Handle resetting document to pending status
     */
    const handleResetToPending = async (document) => {
        try {
            console.log('🔄 Resetting document to pending:', document.id);

            // Update document status to pending and remove attestation data
            const updatedDocument = await documentService.updateDocumentStatus(
                document.id,
                DOCUMENT_STATUS.PENDING,
                {
                    attestation: null, // Remove broken attestation data
                }
            );

            toast.success('Document reset to pending status. You can now re-attest it.');

            // Refresh the document list
            if (onDocumentUpdate) {
                onDocumentUpdate();
            }

            // Close the modal
            onClose();

        } catch (error) {
            console.error('❌ Failed to reset document:', error);
            toast.error(`Failed to reset document: ${error.message}`);
        }
    };

    /**
     * Handle attestation form submission
     */
    const handleAttestation = async (e) => {
        e.preventDefault();

        try {
            setIsAttesting(true);
            setAttestationError(null);

            // Import EIP-712 utilities
            const { signAttestation, validateAttestationData, createAttestationData } = await import('../utils/eip712.js');

            // Get blockchain service and current user
            const currentUser = authService.getCurrentUser();
            if (!currentUser?.walletAddress) {
                throw new Error('Verifier wallet address not found');
            }

            // Get signer from blockchain service
            const signer = await blockchainService.getSigner();
            if (!signer) {
                throw new Error('Unable to get wallet signer');
            }

            // Get contract address
            const contractAddress = blockchainService.getContractAddress('carbonCredit');
            if (!contractAddress) {
                throw new Error('Carbon credit contract address not found');
            }

            // Validate that document has uploader information
            if (!document.uploadedBy) {
                throw new Error('Document is missing uploader address. This document may be corrupted or from an older version.');
            }

            // Get nonce for the recipient
            const nonce = await blockchainService.getNonce(document.uploadedBy);

            // Create attestation data
            const fullAttestationData = createAttestationData(attestationData, document, nonce);

            // Debug: Log attestation data before validation
            console.log('🔍 Attestation data before validation:', {
                document: {
                    id: document.id,
                    cid: document.cid,
                    ipfsCid: document.ipfsCid,
                    hash: document.hash,
                    cidType: typeof document.cid,
                    cidLength: document.cid?.length,
                    uploadedBy: document.uploadedBy,
                    allDocumentKeys: Object.keys(document)
                },
                attestationData,
                fullAttestationData
            });

            // Validate attestation data
            validateAttestationData(fullAttestationData);

            console.log('🔐 Generating attestation signature...', fullAttestationData);

            // Generate EIP-712 signature
            const signature = await signAttestation(fullAttestationData, contractAddress, signer);

            // Add signature to attestation data
            const signedAttestationData = {
                ...fullAttestationData,
                signature,
            };

            console.log('📝 Submitting attestation...');

            // Submit attestation
            const result = await documentService.attestDocument(document.id, signedAttestationData);

            console.log('✅ Attestation successful:', result);

            toast.success('Document attested successfully! Now minting credits...');

            // After successful attestation, automatically mint credits
            try {
                console.log('🪙 Starting automatic credit minting...');

                const mintingResult = await blockchainService.mintCarbonCreditsWithDocumentTracking(
                    signedAttestationData,
                    document.id,
                    document
                );

                console.log('✅ Credits minted successfully:', mintingResult);

                toast.success(`Credits minted and allocated to ${document.uploadedBy}!`, {
                    duration: 6000
                });

                // Update document with minting information
                await documentService.updateDocumentMinting(document.id, {
                    transactionHash: mintingResult.receipt?.hash,
                    mintedAt: new Date().toISOString(),
                    mintedBy: await blockchainService.getCurrentAddress(),
                    amount: signedAttestationData.amount,
                    recipient: signedAttestationData.recipient,
                    tokenId: mintingResult.tokenId
                });

            } catch (mintingError) {
                console.error('❌ Minting failed after attestation:', mintingError);

                // Show error but don't fail the attestation
                toast.error(`Attestation successful, but minting failed: ${mintingError.message}`, {
                    duration: 8000
                });
            }

            // Close form and refresh documents
            setShowAttestationForm(false);
            if (onDocumentUpdate) {
                onDocumentUpdate();
            }

        } catch (error) {
            console.error('❌ Attestation failed:', error);
            setAttestationError(error.message);
            toast.error(`Attestation failed: ${error.message}`);
        } finally {
            setIsAttesting(false);
        }
    };

    /**
     * Handle form input changes
     */
    const handleInputChange = (field, value) => {
        setAttestationData(prev => ({
            ...prev,
            [field]: value,
        }));

        // Clear error when user starts typing
        if (attestationError) {
            setAttestationError(null);
        }
    };

    /**
     * Get status badge for document
     */
    const getStatusBadge = (status) => {
        const statusConfig = {
            [DOCUMENT_STATUS.PENDING]: {
                color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                icon: ClockIcon,
                label: 'Pending Attestation',
            },
            [DOCUMENT_STATUS.ATTESTED]: {
                color: 'bg-green-100 text-green-800 border-green-200',
                icon: CheckCircleIcon,
                label: 'Attested',
            },
            [DOCUMENT_STATUS.MINTED]: {
                color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                icon: CheckCircleIcon,
                label: 'Minted',
            },
            [DOCUMENT_STATUS.REJECTED]: {
                color: 'bg-red-100 text-red-800 border-red-200',
                icon: XCircleIcon,
                label: 'Rejected',
            },
        };

        const config = statusConfig[status] || statusConfig[DOCUMENT_STATUS.PENDING];
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
                <Icon className="w-4 h-4" />
                <span>{config.label}</span>
            </span>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-carbon-900">Document Details</h2>
                            <div className="mt-2">
                                {getStatusBadge(document.status)}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-carbon-400 hover:text-carbon-600 rounded-lg hover:bg-carbon-100"
                        >
                            <XCircleIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Document Information */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-carbon-900 mb-2">Project Information</h3>
                                <div className="bg-carbon-50 rounded-lg p-4 space-y-2">
                                    <p><span className="font-medium">Name:</span> {document.projectName}</p>
                                    <p><span className="font-medium">Type:</span> {document.projectType || 'Not specified'}</p>
                                    <p><span className="font-medium">Description:</span> {document.description || 'No description'}</p>
                                    <p><span className="font-medium">Location:</span> {document.location || 'Not specified'}</p>
                                    <p><span className="font-medium">Estimated Credits:</span> {document.estimatedCredits || 0}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-carbon-900 mb-2">Uploader Information</h3>
                                <div className="bg-carbon-50 rounded-lg p-4 space-y-2">
                                    <p><span className="font-medium">Name:</span> {document.uploaderName || 'Unknown'}</p>
                                    <p><span className="font-medium">Email:</span> {document.uploaderEmail || 'Unknown'}</p>
                                    <p><span className="font-medium">Type:</span> {document.uploaderType || 'individual'}</p>
                                    <p><span className="font-medium">Address:</span> {document.uploadedBy}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-carbon-900 mb-2">File Information</h3>
                                <div className="bg-carbon-50 rounded-lg p-4 space-y-2">
                                    <p><span className="font-medium">Filename:</span> {document.filename}</p>
                                    <p><span className="font-medium">Size:</span> {documentService.formatFileSize(document.fileSize || 0)}</p>
                                    <p><span className="font-medium">IPFS CID:</span> <code className="text-xs bg-carbon-200 px-1 rounded">{document.cid}</code></p>
                                    <p><span className="font-medium">Uploaded:</span> {new Date(document.createdAt || document.uploadedAt).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Document Viewer */}
                            <div>
                                <h3 className="font-semibold text-carbon-900 mb-2">Document Viewer</h3>
                                <DocumentViewer document={document} />
                            </div>

                            {/* Attestation Information */}
                            {isAttested && document.attestation && (
                                <div>
                                    <h3 className="font-semibold text-carbon-900 mb-2">Attestation Information</h3>
                                    <div className="bg-green-50 rounded-lg p-4 space-y-2">
                                        <p><span className="font-medium">Verifier:</span> {document.attestation.verifierAddress}</p>
                                        <p><span className="font-medium">Attested At:</span> {new Date(document.attestation.attestedAt).toLocaleString()}</p>
                                        <p><span className="font-medium">GS Project ID:</span> {document.attestation.gsProjectId}</p>
                                        <p><span className="font-medium">GS Serial:</span> {document.attestation.gsSerial}</p>
                                        <p><span className="font-medium">Amount:</span> {document.attestation.amount} credits</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Attestation Form */}
                        <div>
                            {canAttest && !showAttestationForm && (
                                <div className="bg-blue-50 rounded-lg p-6 text-center">
                                    <CheckCircleIcon className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-carbon-900 mb-2">Ready for Attestation</h3>
                                    <p className="text-carbon-600 mb-4">
                                        This document is pending attestation. Review the project details and attest if valid.
                                    </p>
                                    <button
                                        onClick={() => setShowAttestationForm(true)}
                                        className="btn-primary"
                                    >
                                        Start Attestation
                                    </button>
                                </div>
                            )}

                            {canAttest && showAttestationForm && (
                                <div className="bg-white border border-carbon-200 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-carbon-900 mb-4">Attest Document</h3>

                                    {attestationError && (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                                                <p className="text-sm text-red-700">{attestationError}</p>
                                            </div>
                                        </div>
                                    )}

                                    <form onSubmit={handleAttestation} className="space-y-4">
                                        <div>
                                            <label htmlFor="gsProjectId" className="block text-sm font-medium text-carbon-700 mb-1">
                                                Gold Standard Project ID *
                                            </label>
                                            <input
                                                type="text"
                                                id="gsProjectId"
                                                value={attestationData.gsProjectId}
                                                onChange={(e) => handleInputChange('gsProjectId', e.target.value)}
                                                placeholder="e.g., GS12345"
                                                required
                                                disabled={isAttesting}
                                                className="w-full px-3 py-2 border border-carbon-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-carbon-100"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="gsSerial" className="block text-sm font-medium text-carbon-700 mb-1">
                                                Gold Standard Serial Number *
                                            </label>
                                            <input
                                                type="text"
                                                id="gsSerial"
                                                value={attestationData.gsSerial}
                                                onChange={(e) => handleInputChange('gsSerial', e.target.value)}
                                                placeholder="e.g., GS12345-001-2024"
                                                required
                                                disabled={isAttesting}
                                                className="w-full px-3 py-2 border border-carbon-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-carbon-100"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="amount" className="block text-sm font-medium text-carbon-700 mb-1">
                                                Credits to Mint
                                            </label>
                                            <input
                                                type="number"
                                                id="amount"
                                                value={attestationData.amount}
                                                onChange={(e) => handleInputChange('amount', Number(e.target.value))}
                                                min="1"
                                                max="1000000"
                                                required
                                                disabled={isAttesting}
                                                className="w-full px-3 py-2 border border-carbon-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-carbon-100"
                                            />
                                            <p className="text-xs text-carbon-500 mt-1">
                                                Estimated: {document.estimatedCredits || 0} credits
                                            </p>
                                        </div>

                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                            <div className="flex items-start space-x-2">
                                                <InformationCircleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                                                <div className="text-sm text-yellow-700">
                                                    <p className="font-medium mb-1">Attestation Process</p>
                                                    <p>You will be asked to sign a transaction to attest this document. The credits will be automatically allocated to the document uploader.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowAttestationForm(false)}
                                                disabled={isAttesting}
                                                className="btn-secondary flex-1"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isAttesting || !attestationData.gsProjectId || !attestationData.gsSerial}
                                                className="btn-primary flex-1 inline-flex items-center justify-center space-x-2"
                                            >
                                                {isAttesting ? (
                                                    <>
                                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                        <span>Attesting...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                        <span>Attest Document</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {isAttested && document.attestation && (() => {
                                // Check if attestation data is complete
                                const requiredFields = ['signature', 'gsProjectId', 'gsSerial', 'amount', 'nonce'];
                                const missingFields = requiredFields.filter(field => !document.attestation[field]);

                                if (missingFields.length > 0) {
                                    // Broken attestation data
                                    return (
                                        <div className="bg-red-50 rounded-lg p-6 text-center">
                                            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold text-carbon-900 mb-2">Attestation Data Incomplete</h3>
                                            <p className="text-carbon-600 mb-4">
                                                This document is marked as attested but is missing required data for minting.
                                            </p>
                                            <div className="text-sm text-red-600 mb-4">
                                                <p>Missing fields: {missingFields.join(', ')}</p>
                                                <p>This likely happened before our recent fix.</p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    // Reset document to pending status
                                                    if (confirm('Reset this document to pending status so it can be re-attested?')) {
                                                        handleResetToPending(document);
                                                    }
                                                }}
                                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 mx-auto"
                                            >
                                                <ArrowPathIcon className="w-5 h-5" />
                                                <span>Reset to Pending</span>
                                            </button>
                                        </div>
                                    );
                                } else {
                                    // Complete attestation data
                                    return (
                                        <div className="bg-green-50 rounded-lg p-6 text-center">
                                            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold text-carbon-900 mb-2">Document Attested</h3>
                                            <p className="text-carbon-600 mb-4">
                                                This document has been successfully attested and is ready for minting.
                                            </p>
                                            <div className="text-sm text-carbon-500 mb-4">
                                                <p>Attested by: {document.attestation?.verifierAddress}</p>
                                                <p>Credits: {document.attestation?.amount}</p>
                                                <p>Recipient: {document.uploadedBy}</p>
                                                <p>Attested on: {new Date(document.attestation?.attestedAt).toLocaleDateString()}</p>
                                            </div>

                                            {/* Mint Credits Button */}
                                            <button
                                                onClick={() => handleMinting(document)}
                                                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center space-x-2 mx-auto"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                                </svg>
                                                <span>Mint Credits</span>
                                            </button>
                                        </div>
                                    );
                                }
                            })()}

                            {isAttested && !document.attestation && (
                                <div className="bg-red-50 rounded-lg p-6 text-center">
                                    <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-carbon-900 mb-2">Attestation Data Missing</h3>
                                    <p className="text-carbon-600 mb-4">
                                        This document is marked as attested but has no attestation data.
                                    </p>
                                    <p className="text-sm text-red-600 mb-4">
                                        This likely happened before our recent fix. Please re-attest this document.
                                    </p>

                                    <button
                                        onClick={() => {
                                            if (confirm('Reset this document to pending status so it can be re-attested?')) {
                                                handleResetToPending(document);
                                            }
                                        }}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 mx-auto"
                                    >
                                        <ArrowPathIcon className="w-5 h-5" />
                                        <span>Reset to Pending</span>
                                    </button>
                                </div>
                            )}

                            {isMinted && (
                                <div className="bg-emerald-50 rounded-lg p-6 text-center">
                                    <CheckCircleIcon className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-carbon-900 mb-2">Credits Minted</h3>
                                    <p className="text-carbon-600 mb-4">
                                        Carbon credits have been minted and allocated to the uploader.
                                    </p>
                                </div>
                            )}

                            {isRejected && (
                                <div className="bg-red-50 rounded-lg p-6 text-center">
                                    <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-carbon-900 mb-2">Document Rejected</h3>
                                    <p className="text-carbon-600">
                                        This document has been rejected and cannot be attested.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-6 border-t border-carbon-200 flex justify-end">
                        <button
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}