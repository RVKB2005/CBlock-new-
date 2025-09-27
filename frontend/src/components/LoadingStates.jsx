import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowPathIcon,
    CloudArrowUpIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    CurrencyDollarIcon,
    ShieldCheckIcon,
    UserIcon,
    BuildingOfficeIcon
} from '@heroicons/react/24/outline';

/**
 * Enhanced Loading Component with Role-Specific Messages
 */
export function LoadingSpinner({
    size = 'medium',
    message = 'Loading...',
    userRole = null,
    operation = null,
    showProgress = false,
    progress = 0
}) {
    const sizeClasses = {
        small: 'w-4 h-4',
        medium: 'w-8 h-8',
        large: 'w-12 h-12'
    };

    const getRoleSpecificMessage = (role, operation) => {
        const messages = {
            verifier: {
                document_review: 'Loading documents for verification...',
                attestation: 'Processing document attestation...',
                minting: 'Minting carbon credits...',
                dashboard: 'Loading verifier dashboard...',
                default: 'Loading verifier interface...'
            },
            business: {
                document_upload: 'Uploading business project document...',
                dashboard: 'Loading business dashboard...',
                portfolio: 'Loading project portfolio...',
                default: 'Loading business interface...'
            },
            individual: {
                document_upload: 'Uploading project document...',
                dashboard: 'Loading your dashboard...',
                portfolio: 'Loading your documents...',
                default: 'Loading your interface...'
            },
            guest: {
                login: 'Signing you in...',
                registration: 'Creating your account...',
                default: 'Loading application...'
            }
        };

        const roleMessages = messages[role] || messages.guest;
        return roleMessages[operation] || roleMessages.default || message;
    };

    const displayMessage = userRole && operation
        ? getRoleSpecificMessage(userRole, operation)
        : message;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center space-y-3"
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className={`${sizeClasses[size]} text-primary-500`}
            >
                <ArrowPathIcon />
            </motion.div>

            <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                    {displayMessage}
                </p>

                {showProgress && (
                    <div className="mt-2 w-48">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                                className="bg-primary-500 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/**
 * Document Operation Loading States
 */
export function DocumentUploadLoading({
    stage = 'preparing',
    progress = 0,
    fileName = '',
    userRole = 'individual'
}) {
    const stages = {
        preparing: {
            icon: DocumentTextIcon,
            title: 'Preparing Upload',
            description: 'Validating document and metadata...'
        },
        uploading: {
            icon: CloudArrowUpIcon,
            title: 'Uploading to IPFS',
            description: `Storing ${fileName} on decentralized network...`
        },
        registering: {
            icon: CheckCircleIcon,
            title: 'Registering Document',
            description: 'Recording document on blockchain...'
        },
        completing: {
            icon: CheckCircleIcon,
            title: 'Finalizing',
            description: 'Completing document submission...'
        }
    };

    const currentStage = stages[stage] || stages.preparing;
    const Icon = currentStage.icon;

    const getRoleMessage = (role) => {
        const roleMessages = {
            individual: 'Your document is being submitted for verification by authorized verifiers.',
            business: 'Your business project document is being submitted for verification.',
            verifier: 'Document is being processed in the verification system.'
        };
        return roleMessages[role] || roleMessages.individual;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6 max-w-md mx-auto"
        >
            <div className="text-center space-y-4">
                {/* Icon */}
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: stage === 'uploading' ? [0, 360] : 0
                    }}
                    transition={{
                        duration: stage === 'uploading' ? 2 : 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto"
                >
                    <Icon className="w-8 h-8 text-primary-600" />
                </motion.div>

                {/* Title and Description */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {currentStage.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                        {currentStage.description}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                            className="bg-primary-500 h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>

                {/* Role-specific message */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700">
                        💡 {getRoleMessage(userRole)}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

/**
 * Blockchain Transaction Loading
 */
export function BlockchainTransactionLoading({
    operation = 'transaction',
    userRole = 'individual',
    transactionHash = null,
    estimatedTime = null
}) {
    const operations = {
        attestation: {
            icon: ShieldCheckIcon,
            title: 'Processing Attestation',
            description: 'Verifying document on blockchain...',
            roleMessages: {
                verifier: 'Your attestation signature is being recorded on the blockchain.',
                individual: 'A verifier is processing your document attestation.',
                business: 'Your business document is being attested by a verifier.'
            }
        },
        minting: {
            icon: CurrencyDollarIcon,
            title: 'Minting Credits',
            description: 'Creating carbon credits on blockchain...',
            roleMessages: {
                verifier: 'You are minting carbon credits for the verified document.',
                individual: 'Carbon credits are being minted for your document.',
                business: 'Carbon credits are being minted for your business project.'
            }
        },
        registration: {
            icon: DocumentTextIcon,
            title: 'Registering Document',
            description: 'Recording document metadata on blockchain...',
            roleMessages: {
                verifier: 'Document is being registered in the verification system.',
                individual: 'Your document is being registered for verification.',
                business: 'Your business document is being registered for verification.'
            }
        },
        transaction: {
            icon: ArrowPathIcon,
            title: 'Processing Transaction',
            description: 'Waiting for blockchain confirmation...',
            roleMessages: {
                verifier: 'Your transaction is being processed on the blockchain.',
                individual: 'Transaction is being processed on the blockchain.',
                business: 'Transaction is being processed on the blockchain.'
            }
        }
    };

    const currentOp = operations[operation] || operations.transaction;
    const Icon = currentOp.icon;
    const roleMessage = currentOp.roleMessages[userRole] || currentOp.roleMessages.individual;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl border border-gray-200 p-6 max-w-md mx-auto"
        >
            <div className="text-center space-y-4">
                {/* Animated Icon */}
                <motion.div
                    animate={{
                        rotate: [0, 360],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{
                        rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto"
                >
                    <Icon className="w-8 h-8 text-blue-600" />
                </motion.div>

                {/* Title and Description */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {currentOp.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                        {currentOp.description}
                    </p>
                    <p className="text-xs text-blue-600">
                        {roleMessage}
                    </p>
                </div>

                {/* Transaction Details */}
                {transactionHash && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="text-xs text-gray-500">Transaction Hash:</div>
                        <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded break-all">
                            {transactionHash}
                        </code>
                    </div>
                )}

                {/* Estimated Time */}
                {estimatedTime && (
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                        <ClockIcon className="w-4 h-4" />
                        <span>Estimated time: {estimatedTime}</span>
                    </div>
                )}

                {/* Loading Animation */}
                <div className="flex justify-center space-x-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5]
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.2
                            }}
                            className="w-2 h-2 bg-blue-500 rounded-full"
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

/**
 * Retry Loading Component
 */
export function RetryLoading({
    attempt = 1,
    maxAttempts = 3,
    operation = 'operation',
    onCancel = null,
    delay = 0
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto"
        >
            <div className="text-center space-y-3">
                {/* Icon */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto"
                >
                    <ArrowPathIcon className="w-5 h-5 text-yellow-600" />
                </motion.div>

                {/* Message */}
                <div>
                    <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                        Retrying {operation}...
                    </h4>
                    <p className="text-xs text-yellow-700">
                        Attempt {attempt} of {maxAttempts}
                    </p>
                    {delay > 0 && (
                        <p className="text-xs text-yellow-600 mt-1">
                            Waiting {delay}ms before retry...
                        </p>
                    )}
                </div>

                {/* Progress */}
                <div className="w-full bg-yellow-200 rounded-full h-1">
                    <motion.div
                        className="bg-yellow-500 h-1 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(attempt / maxAttempts) * 100}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>

                {/* Cancel Button */}
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="text-xs text-yellow-700 hover:text-yellow-900 underline"
                    >
                        Cancel retry
                    </button>
                )}
            </div>
        </motion.div>
    );
}

/**
 * Role-Specific Dashboard Loading
 */
export function DashboardLoading({ userRole = 'individual' }) {
    const getRoleIcon = (role) => {
        const icons = {
            verifier: ShieldCheckIcon,
            business: BuildingOfficeIcon,
            individual: UserIcon,
            guest: UserIcon
        };
        return icons[role] || UserIcon;
    };

    const getRoleLoadingMessage = (role) => {
        const messages = {
            verifier: {
                title: 'Loading Verifier Dashboard',
                items: [
                    'Fetching pending documents...',
                    'Loading attestation tools...',
                    'Checking verifier permissions...',
                    'Initializing minting interface...'
                ]
            },
            business: {
                title: 'Loading Business Dashboard',
                items: [
                    'Loading your projects...',
                    'Fetching document status...',
                    'Calculating credit estimates...',
                    'Preparing upload interface...'
                ]
            },
            individual: {
                title: 'Loading Your Dashboard',
                items: [
                    'Loading your documents...',
                    'Checking credit balance...',
                    'Fetching verification status...',
                    'Preparing project interface...'
                ]
            },
            guest: {
                title: 'Loading Application',
                items: [
                    'Initializing interface...',
                    'Loading authentication...',
                    'Preparing registration...',
                    'Setting up features...'
                ]
            }
        };
        return messages[role] || messages.guest;
    };

    const RoleIcon = getRoleIcon(userRole);
    const roleData = getRoleLoadingMessage(userRole);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md w-full"
            >
                <div className="text-center space-y-6">
                    {/* Role Icon */}
                    <motion.div
                        animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto"
                    >
                        <RoleIcon className="w-8 h-8 text-white" />
                    </motion.div>

                    {/* Title */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {roleData.title}
                        </h2>
                        <p className="text-sm text-gray-600 capitalize">
                            {userRole} Account
                        </p>
                    </div>

                    {/* Loading Items */}
                    <div className="space-y-3">
                        {roleData.items.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.2 }}
                                className="flex items-center space-x-3 text-left"
                            >
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        ease: "linear",
                                        delay: index * 0.1
                                    }}
                                    className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                                />
                                <span className="text-sm text-gray-700">{item}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex justify-center space-x-2">
                        {[0, 1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [0.3, 1, 0.3]
                                }}
                                transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                    delay: i * 0.15
                                }}
                                className="w-2 h-2 bg-blue-500 rounded-full"
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/**
 * Generic Loading Overlay
 */
export function LoadingOverlay({
    show = false,
    message = 'Loading...',
    userRole = null,
    operation = null,
    transparent = false
}) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 z-50 flex items-center justify-center ${transparent ? 'bg-black/20' : 'bg-white/80'
                        } backdrop-blur-sm`}
                >
                    <LoadingSpinner
                        size="large"
                        message={message}
                        userRole={userRole}
                        operation={operation}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}