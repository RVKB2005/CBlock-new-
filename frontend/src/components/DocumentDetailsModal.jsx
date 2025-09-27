import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    DocumentTextIcon,
    XMarkIcon,
    ExclamationCircleIcon,
    InformationCircleIcon,
    CalendarIcon,
    CurrencyDollarIcon,
    MapPinIcon,
    TagIcon,
    LinkIcon,
    ShieldCheckIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    ArrowPathIcon,
    UserIcon,
    BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import documentService, { DOCUMENT_STATUS } from '../services/document.js';
import authService from '../services/auth.js';
import blockchainService from '../services/blockchain.js';
import { signAttestation, validateAttestationData, createAttestationData } from '../utils/eip712.js';

/**
 * Document Details Modal with Attestation Functionality
 */
export default function DocumentDetailsModal({ document, onClose, onDocumentUpdate }) {
    const [showAttestationForm, setShowAttestationForm] = useState(false);
    const [attestationData, setAttestationData] = useState({
        gsProjectId: '',
        gsSerial: '',
        amount: document?.estimatedCredits || 0,
    });
    const [isAttesting, setIsAttesting] = useState(false);
    const [attestationErrors, setAttestationErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [actionError, setActionError] = useState(null);
    const [isMinting, setIsMinting] = useState(false);
    const [showMintingForm, setShowMintingForm] = useState(false);

    // Reset form when document changes
    useEffect(() => {
        if (document) {
            setAttestationData({
                gsProjectId: '',
                gsSerial: '',
                amount: document.estimatedCredits || 0,
            });
            setAttestationErrors({});
            setActionError(null);
            setShowAttestationForm(false);
            setShowMintingForm(false);
        }
    }, [document]);

    const handleAttestationInputChange = (field, value) => {
        setAttestationData(prev => ({
            ...prev,
            [field]: value
        }));

        if (attestationErrors[field]) {
            setAttestationErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
    };

    const validateAttestationForm = () => {
        const errors = {};

        if (!attestationData.gsProjectId.trim()) {
            errors.gsProjectId = 'Gold Standard Project ID is required';
        } else if (attestationData.gsProjectId.length < 3) {
            errors.gsProjectId = 'Project ID must be at least 3 characters';
        }

        if (!attestationData.gsSerial.trim()) {
            errors.gsSerial = 'Gold Standard Serial Number is required';
        } else if (attestationData.gsSerial.length < 3) {
            errors.gsSerial = 'Serial number must be at least 3 characters';
        }

        if (!attestationData.amount || attestationData.amount <= 0) {
            errors.amount = 'Amount must be greater than 0';
        } else if (attestationData.amount > 1000000) {
            errors.amount = 'Amount cannot exceed 1,000,000';
        }

        setAttestationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAttestation = async () => {
        try {
            setIsAttesting(true);
            setActionError(null);

            if (!validateAttestationForm()) {
                toast.error('Please fix the form errors before submitting');
                return;
            }

            if (!authService.isVerifier()) {
                throw new Error('Only verifiers can attest documents');
            }

            const currentUser = authService.getCurrentUser();
            if (!currentUser?.walletAddress) {
                throw new Error('Verifier wallet address not found');
            }

            const nonce = Date.now();
            const eip712Data = createAttestationData(attestationData, document, nonce);
            validateAttestationData(eip712Data);

            const signer = await blockchainService.getSigner();
            if (!signer) {
                throw new Error('Unable to get blockchain signer. Please connect your wallet.');
            }

            const contractAddress = blockchainService.getContractAddress('carbonCredit');
            if (!contractAddress) {
                throw new Error('Carbon Credit contract address not found');
            }

            toast.loading('Please sign the attestation in your wallet...', { id: 'attestation-sign' });
            const signature = await signAttestation(eip712Data, contractAddress, signer);
            toast.dismiss('attestation-sign');

            toast.loading('Submitting attestation...', { id: 'attestation-submit' });
            const attestationResult = await documentService.attestDocument(document.id || document.cid, {
                ...eip712Data,
                signature,
                verifierAddress: currentUser.walletAddress,
            });
            toast.dismiss('attestation-submit');

            if (attestationResult.success) {
                toast.success('Document attested successfully!');
                setShowAttestationForm(false);
                if (onDocumentUpdate) {
                    onDocumentUpdate();
                }
            } else {
                throw new Error(attestationResult.message || 'Attestation failed');
            }

        } catch (error) {
            toast.dismiss('attestation-sign');
            toast.dismiss('attestation-submit');

            let errorMessage = error.message;
            if (error.message.includes('user rejected') || error.message.includes('User denied')) {
                errorMessage = 'Signature was rejected. Please try again.';
            } else if (error.message.includes('already been attested')) {
                errorMessage = 'This document has already been attested.';
            } else if (error.message.includes('not found')) {
                errorMessage = 'Document not found. Please refresh and try again.';
            } else if (error.message.includes('Only verifiers')) {
                errorMessage = 'You do not have permission to attest documents.';
            }

            setActionError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsAttesting(false);
        }
    };

    const handleRejectDocument = async () => {
        try {
            setIsLoading(true);
            setActionError(null);

            if (!authService.isVerifier()) {
                throw new Error('Only verifiers can reject documents');
            }

            const confirmed = window.confirm(
                'Are you sure you want to reject this document? This action cannot be undone.'
            );

            if (!confirmed) {
                return;
            }

            const result = await documentService.updateDocumentStatus(
                document.id || document.cid,
                DOCUMENT_STATUS.REJECTED,
                {
                    rejectedBy: authService.getCurrentUser()?.walletAddress,
                    rejectedAt: new Date().toISOString(),
                    rejectionReason: 'Rejected by verifier',
                }
            );

            if (result) {
                toast.success('Document rejected successfully');
                if (onDocumentUpdate) {
                    onDocumentUpdate();
                }
            }
        } catch (error) {
            const errorMessage = error.message || 'Failed to reject document';
            setActionError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMinting = async () => {
        try {
            setIsMinting(true);
            setActionError(null);

            if (!authService.isVerifier()) {
                throw new Error('Only verifiers can mint credits');
            }

            if (document.status !== DOCUMENT_STATUS.ATTESTED) {
                throw new Error('Document must be attested before minting');
            }

            if (document.status === DOCUMENT_STATUS.MINTED) {
                throw new Error('Document has already been minted');
            }

            if (!document.attestation || !document.attestation.signature) {
                throw new Error('Document attestation data not found');
            }

            const currentUser = authService.getCurrentUser();
            if (!currentUser?.walletAddress) {
                throw new Error('Verifier wallet address not found');
            }

            // Prepare minting data using the existing attestation
            const mintingData = {
                recipient: document.uploadedBy || document.uploader, // Original uploader gets the credits
                gsProjectId: document.attestation.gsProjectId,
                gsSerial: document.attestation.gsSerial,
                ipfsHash: document.cid,
                quantity: document.attestation.amount || document.estimatedCredits,
                signature: document.attestation.signature,
            };

            console.log('🪙 Starting minting process:', {
                documentId: document.id || document.cid,
                recipient: mintingData.recipient,
                amount: mintingData.quantity,
            });

            toast.loading('Minting carbon credits...', { id: 'minting-process' });

            // Check if document can be minted (prevent duplicates)
            const mintingEligibility = await documentService.canDocumentBeMinted(document.id || document.cid);
            if (!mintingEligibility.canMint) {
                throw new Error(mintingEligibility.reason);
            }

            // Call the blockchain service to mint credits with document tracking and automatic allocation
            const mintingResult = await blockchainService.mintCarbonCreditsWithDocumentTracking(
                mintingData,
                document.id || document.cid,
                document // Pass full document data for allocation tracking
            );

            toast.dismiss('minting-process');

            if (mintingResult.hash) {
                // Update document status to minted with comprehensive tracking
                const updatedDocument = await documentService.updateDocumentMinting(
                    document.id || document.cid,
                    {
                        transactionHash: mintingResult.hash,
                        mintedAt: new Date().toISOString(),
                        mintedBy: currentUser.walletAddress,
                        amount: mintingData.quantity,
                        recipient: mintingData.recipient,
                        tokenId: mintingResult.tokenId,
                    }
                );

                // Enhanced success message with allocation information
                let successMessage = `Successfully minted ${mintingData.quantity} credits to ${blockchainService.formatAddress(mintingData.recipient)}!`;

                if (mintingResult.allocation?.success) {
                    successMessage += ` Credits have been automatically allocated to the document uploader.`;
                } else if (mintingResult.allocationError) {
                    successMessage += ` Note: Credit allocation failed but can be retried later.`;
                }

                toast.success(successMessage, { duration: 8000 });
                setShowMintingForm(false);

                if (onDocumentUpdate) {
                    onDocumentUpdate();
                }
            } else {
                throw new Error('Minting transaction failed');
            }

        } catch (error) {
            toast.dismiss('minting-process');

            let errorMessage = error.message;
            if (error.message.includes('user rejected') || error.message.includes('User denied')) {
                errorMessage = 'Transaction was rejected. Please try again.';
            } else if (error.message.includes('already been minted')) {
                errorMessage = 'This document has already been minted.';
            } else if (error.message.includes('must be attested')) {
                errorMessage = 'Document must be attested before minting credits.';
            } else if (error.message.includes('Only verifiers')) {
                errorMessage = 'You do not have permission to mint credits.';
            } else if (error.message.includes('insufficient funds')) {
                errorMessage = 'Insufficient funds to complete the transaction.';
            }

            setActionError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsMinting(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            [DOCUMENT_STATUS.PENDING]: {
                color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                icon: ClockIcon,
                label: 'Pending Review',
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
            <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
                <Icon className="w-4 h-4" />
                <span>{config.label}</span>
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Invalid date';
        }
    };

    const getUploaderIcon = (uploaderType) => {
        return uploaderType === 'business' ? BuildingOfficeIcon : UserIcon;
    };

    if (!document) {
        return null;
    }

    const UploaderIcon = getUploaderIcon(document.uploaderType);
    const canAttest = authService.isVerifier() && document.status === DOCUMENT_STATUS.PENDING;
    const canReject = authService.isVerifier() && document.status === DOCUMENT_STATUS.PENDING;
    const canMint = authService.isVerifier() && document.status === DOCUMENT_STATUS.ATTESTED;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-carbon-200">
                    <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="w-6 h-6 text-primary-600" />
                        <div>
                            <h2 className="text-xl font-semibold text-carbon-900">
                                {document.projectName || 'Untitled Project'}
                            </h2>
                            <p className="text-sm text-carbon-600">
                                {document.filename || 'Unknown file'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {getStatusBadge(document.status)}
                        <button
                            onClick={onClose}
                            className="p-2 text-carbon-400 hover:text-carbon-600 hover:bg-carbon-100 rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="p-6 space-y-6">
                        {/* Error Display */}
                        {actionError && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-50 border border-red-200 rounded-lg p-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                                    <p className="text-red-700 font-medium">Error</p>
                                </div>
                                <p className="text-red-600 mt-1">{actionError}</p>
                            </motion.div>
                        )}

                        {/* Document Information */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-carbon-900 flex items-center space-x-2">
                                    <InformationCircleIcon className="w-5 h-5 text-primary-600" />
                                    <span>Document Information</span>
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <UploaderIcon className="w-5 h-5 text-carbon-500" />
                                        <div>
                                            <p className="text-sm font-medium text-carbon-900">
                                                {document.uploaderName || 'Unknown User'}
                                            </p>
                                            <p className="text-xs text-carbon-600 capitalize">
                                                {document.uploaderType || 'individual'} • {document.uploaderEmail || 'No email'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <CalendarIcon className="w-5 h-5 text-carbon-500" />
                                        <div>
                                            <p className="text-sm font-medium text-carbon-900">Uploaded</p>
                                            <p className="text-xs text-carbon-600">
                                                {formatDate(document.createdAt || document.uploadedAt)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <CurrencyDollarIcon className="w-5 h-5 text-carbon-500" />
                                        <div>
                                            <p className="text-sm font-medium text-carbon-900">Estimated Credits</p>
                                            <p className="text-xs text-carbon-600">
                                                {document.estimatedCredits || 0} credits
                                            </p>
                                        </div>
                                    </div>

                                    {document.location && (
                                        <div className="flex items-center space-x-3">
                                            <MapPinIcon className="w-5 h-5 text-carbon-500" />
                                            <div>
                                                <p className="text-sm font-medium text-carbon-900">Location</p>
                                                <p className="text-xs text-carbon-600">{document.location}</p>
                                            </div>
                                        </div>
                                    )}

                                    {document.projectType && (
                                        <div className="flex items-center space-x-3">
                                            <TagIcon className="w-5 h-5 text-carbon-500" />
                                            <div>
                                                <p className="text-sm font-medium text-carbon-900">Project Type</p>
                                                <p className="text-xs text-carbon-600">{document.projectType}</p>
                                            </div>
                                        </div>
                                    )}

                                    {document.ipfsUrl && (
                                        <div className="flex items-center space-x-3">
                                            <LinkIcon className="w-5 h-5 text-carbon-500" />
                                            <div>
                                                <p className="text-sm font-medium text-carbon-900">IPFS Link</p>
                                                <a
                                                    href={document.ipfsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-primary-600 hover:text-primary-700 underline"
                                                >
                                                    View on IPFS
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Project Details */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-carbon-900">Project Details</h3>

                                {document.description && (
                                    <div>
                                        <p className="text-sm font-medium text-carbon-900 mb-2">Description</p>
                                        <p className="text-sm text-carbon-600 bg-carbon-50 p-3 rounded-lg">
                                            {document.description}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-sm font-medium text-carbon-900 mb-2">File Information</p>
                                    <div className="bg-carbon-50 p-3 rounded-lg space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-xs text-carbon-600">File Name:</span>
                                            <span className="text-xs text-carbon-900">{document.filename || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs text-carbon-600">File Size:</span>
                                            <span className="text-xs text-carbon-900">
                                                {document.fileSize ? documentService.formatFileSize(document.fileSize) : 'Unknown'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs text-carbon-600">IPFS CID:</span>
                                            <span className="text-xs text-carbon-900 font-mono">
                                                {document.cid ? `${document.cid.slice(0, 10)}...${document.cid.slice(-6)}` : 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Attestation Information */}
                        {document.attestation && document.attestation.verifierAddress && (
                            <div className="border-t border-carbon-200 pt-6">
                                <h3 className="text-lg font-semibold text-carbon-900 flex items-center space-x-2 mb-4">
                                    <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                                    <span>Attestation Information</span>
                                </h3>

                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-green-900">Verifier Address</p>
                                            <p className="text-xs text-green-700 font-mono">
                                                {document.attestation.verifierAddress}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-green-900">Attested At</p>
                                            <p className="text-xs text-green-700">
                                                {formatDate(document.attestation.attestedAt)}
                                            </p>
                                        </div>
                                        {document.attestation.gsProjectId && (
                                            <div>
                                                <p className="text-sm font-medium text-green-900">GS Project ID</p>
                                                <p className="text-xs text-green-700">{document.attestation.gsProjectId}</p>
                                            </div>
                                        )}
                                        {document.attestation.gsSerial && (
                                            <div>
                                                <p className="text-sm font-medium text-green-900">GS Serial Number</p>
                                                <p className="text-xs text-green-700">{document.attestation.gsSerial}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Minting Information */}
                        {document.mintingResult && document.mintingResult.transactionHash && (
                            <div className="border-t border-carbon-200 pt-6">
                                <h3 className="text-lg font-semibold text-carbon-900 flex items-center space-x-2 mb-4">
                                    <CurrencyDollarIcon className="w-5 h-5 text-emerald-600" />
                                    <span>Minting Information</span>
                                </h3>

                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-emerald-900">Transaction Hash</p>
                                            <p className="text-xs text-emerald-700 font-mono break-all">
                                                {document.mintingResult.transactionHash}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-emerald-900">Minted At</p>
                                            <p className="text-xs text-emerald-700">
                                                {formatDate(document.mintingResult.mintedAt)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-emerald-900">Credits Minted</p>
                                            <p className="text-xs text-emerald-700 font-semibold">
                                                {document.mintingResult.amount || 0} credits
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-emerald-900">Recipient</p>
                                            <p className="text-xs text-emerald-700 font-mono">
                                                {document.mintingResult.recipient ?
                                                    blockchainService.formatAddress(document.mintingResult.recipient) :
                                                    'Unknown'
                                                }
                                            </p>
                                        </div>
                                        {document.mintingResult.mintedBy && (
                                            <div>
                                                <p className="text-sm font-medium text-emerald-900">Minted By</p>
                                                <p className="text-xs text-emerald-700 font-mono">
                                                    {blockchainService.formatAddress(document.mintingResult.mintedBy)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Attestation Form */}
                        <AnimatePresence>
                            {showAttestationForm && canAttest && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="border-t border-carbon-200 pt-6"
                                >
                                    <h3 className="text-lg font-semibold text-carbon-900 mb-4">Attest Document</h3>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                        <div className="flex items-start space-x-2">
                                            <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-blue-900">Attestation Process</p>
                                                <p className="text-xs text-blue-700 mt-1">
                                                    By attesting this document, you confirm that you have reviewed the project details
                                                    and verify that it meets the Gold Standard requirements. This action will generate
                                                    an EIP-712 signature and record the attestation on the blockchain.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="gsProjectId" className="block text-sm font-medium text-carbon-700 mb-2">
                                                    Gold Standard Project ID *
                                                </label>
                                                <input
                                                    type="text"
                                                    id="gsProjectId"
                                                    value={attestationData.gsProjectId}
                                                    onChange={(e) => handleAttestationInputChange('gsProjectId', e.target.value)}
                                                    placeholder="e.g., GS12345"
                                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${attestationErrors.gsProjectId
                                                        ? 'border-red-300 bg-red-50'
                                                        : 'border-carbon-300'
                                                        }`}
                                                    disabled={isAttesting}
                                                />
                                                {attestationErrors.gsProjectId && (
                                                    <p className="text-xs text-red-600 mt-1">{attestationErrors.gsProjectId}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="gsSerial" className="block text-sm font-medium text-carbon-700 mb-2">
                                                    Gold Standard Serial Number *
                                                </label>
                                                <input
                                                    type="text"
                                                    id="gsSerial"
                                                    value={attestationData.gsSerial}
                                                    onChange={(e) => handleAttestationInputChange('gsSerial', e.target.value)}
                                                    placeholder="e.g., GS12345-001-2024"
                                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${attestationErrors.gsSerial
                                                        ? 'border-red-300 bg-red-50'
                                                        : 'border-carbon-300'
                                                        }`}
                                                    disabled={isAttesting}
                                                />
                                                {attestationErrors.gsSerial && (
                                                    <p className="text-xs text-red-600 mt-1">{attestationErrors.gsSerial}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="amount" className="block text-sm font-medium text-carbon-700 mb-2">
                                                Credits to Mint *
                                            </label>
                                            <input
                                                type="number"
                                                id="amount"
                                                value={attestationData.amount}
                                                onChange={(e) => handleAttestationInputChange('amount', Number(e.target.value))}
                                                min="1"
                                                max="1000000"
                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${attestationErrors.amount
                                                    ? 'border-red-300 bg-red-50'
                                                    : 'border-carbon-300'
                                                    }`}
                                                disabled={isAttesting}
                                            />
                                            {attestationErrors.amount && (
                                                <p className="text-xs text-red-600 mt-1">{attestationErrors.amount}</p>
                                            )}
                                            <p className="text-xs text-carbon-600 mt-1">
                                                Credits will be automatically allocated to the document uploader
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end space-x-3 mt-6">
                                        <button
                                            onClick={() => setShowAttestationForm(false)}
                                            className="px-4 py-2 text-carbon-600 hover:text-carbon-800 hover:bg-carbon-100 rounded-lg transition-colors"
                                            disabled={isAttesting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAttestation}
                                            disabled={isAttesting}
                                            className="btn-primary inline-flex items-center space-x-2"
                                        >
                                            {isAttesting ? (
                                                <>
                                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                    <span>Attesting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheckIcon className="w-4 h-4" />
                                                    <span>Attest Document</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Minting Form */}
                        <AnimatePresence>
                            {showMintingForm && canMint && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="border-t border-carbon-200 pt-6"
                                >
                                    <h3 className="text-lg font-semibold text-carbon-900 mb-4">Mint Carbon Credits</h3>

                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                                        <div className="flex items-start space-x-2">
                                            <InformationCircleIcon className="w-5 h-5 text-emerald-500 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-emerald-900">Minting Process</p>
                                                <p className="text-xs text-emerald-700 mt-1">
                                                    This will mint {document.attestation?.amount || document.estimatedCredits} carbon credits
                                                    and automatically allocate them to the original document uploader: {' '}
                                                    <span className="font-mono text-xs">
                                                        {blockchainService.formatAddress(document.uploadedBy || document.uploader)}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-carbon-50 p-4 rounded-lg">
                                            <h4 className="text-sm font-semibold text-carbon-900 mb-3">Minting Details</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-carbon-600">Project ID:</span>
                                                    <span className="ml-2 font-medium text-carbon-900">
                                                        {document.attestation?.gsProjectId || 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-carbon-600">Serial Number:</span>
                                                    <span className="ml-2 font-medium text-carbon-900">
                                                        {document.attestation?.gsSerial || 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-carbon-600">Credits to Mint:</span>
                                                    <span className="ml-2 font-medium text-emerald-600">
                                                        {document.attestation?.amount || document.estimatedCredits} credits
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-carbon-600">Recipient:</span>
                                                    <span className="ml-2 font-medium text-carbon-900 font-mono text-xs">
                                                        {blockchainService.formatAddress(document.uploadedBy || document.uploader)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Minting Status Check */}
                                        {document.mintingResult && document.mintingResult.transactionHash && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                <div className="flex items-center space-x-2">
                                                    <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                                                    <p className="text-sm font-medium text-red-900">Already Minted</p>
                                                </div>
                                                <p className="text-xs text-red-700 mt-1">
                                                    This document has already been minted. Transaction: {' '}
                                                    <span className="font-mono">{document.mintingResult.transactionHash}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-end space-x-3 mt-6">
                                        <button
                                            onClick={() => setShowMintingForm(false)}
                                            className="px-4 py-2 text-carbon-600 hover:text-carbon-800 hover:bg-carbon-100 rounded-lg transition-colors"
                                            disabled={isMinting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleMinting}
                                            disabled={isMinting || (document.mintingResult && document.mintingResult.transactionHash)}
                                            className="btn-primary bg-emerald-600 hover:bg-emerald-700 inline-flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isMinting ? (
                                                <>
                                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                    <span>Minting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CurrencyDollarIcon className="w-4 h-4" />
                                                    <span>Mint Credits</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t border-carbon-200 p-6">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-carbon-600">
                            {document.source && (
                                <span className="inline-flex items-center space-x-1">
                                    <span>Source:</span>
                                    <span className="font-medium capitalize">{document.source}</span>
                                </span>
                            )}
                        </div>

                        <div className="flex items-center space-x-3">
                            {canReject && (
                                <button
                                    onClick={handleRejectDocument}
                                    disabled={isLoading}
                                    className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 inline-flex items-center space-x-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                            <span>Rejecting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircleIcon className="w-4 h-4" />
                                            <span>Reject</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {canAttest && !showAttestationForm && (
                                <button
                                    onClick={() => setShowAttestationForm(true)}
                                    className="btn-primary inline-flex items-center space-x-2"
                                >
                                    <ShieldCheckIcon className="w-4 h-4" />
                                    <span>Attest Document</span>
                                </button>
                            )}

                            {canMint && !showMintingForm && (
                                <button
                                    onClick={() => setShowMintingForm(true)}
                                    className="btn-primary bg-emerald-600 hover:bg-emerald-700 inline-flex items-center space-x-2"
                                >
                                    <CurrencyDollarIcon className="w-4 h-4" />
                                    <span>Mint Credits</span>
                                </button>
                            )}

                            <button
                                onClick={onClose}
                                className="btn-secondary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}