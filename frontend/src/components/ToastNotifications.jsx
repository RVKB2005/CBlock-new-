import React from 'react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    ShieldCheckIcon,
    CurrencyDollarIcon,
    UserIcon,
    BuildingOfficeIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import authService from '../services/auth.js';

/**
 * Enhanced Toast Notification Service with Role-Specific Messages
 */
class ToastNotificationService {
    constructor() {
        this.defaultDuration = 5000;
        this.position = 'top-right';
    }

    /**
     * Show success toast with role-specific messaging
     */
    success(message, options = {}) {
        const currentUser = authService.getCurrentUser();
        const userRole = currentUser?.accountType || 'guest';

        const enhancedMessage = this.enhanceMessage(message, 'success', userRole, options);

        return toast.success(enhancedMessage, {
            duration: options.duration || this.defaultDuration,
            position: options.position || this.position,
            style: {
                background: '#10B981',
                color: 'white',
                fontWeight: '500',
                ...options.style
            },
            icon: options.icon || '✅',
            ...options
        });
    }

    /**
     * Show error toast with role-specific messaging and guidance
     */
    error(message, options = {}) {
        const currentUser = authService.getCurrentUser();
        const userRole = currentUser?.accountType || 'guest';

        const enhancedMessage = this.enhanceMessage(message, 'error', userRole, options);

        return toast.error(enhancedMessage, {
            duration: options.duration || (this.defaultDuration * 1.5), // Longer for errors
            position: options.position || this.position,
            style: {
                background: '#EF4444',
                color: 'white',
                fontWeight: '500',
                ...options.style
            },
            icon: options.icon || '❌',
            ...options
        });
    }

    /**
     * Show warning toast
     */
    warning(message, options = {}) {
        const currentUser = authService.getCurrentUser();
        const userRole = currentUser?.accountType || 'guest';

        const enhancedMessage = this.enhanceMessage(message, 'warning', userRole, options);

        return toast.error(enhancedMessage, {
            duration: options.duration || this.defaultDuration,
            position: options.position || this.position,
            style: {
                background: '#F59E0B',
                color: 'white',
                fontWeight: '500',
                ...options.style
            },
            icon: options.icon || '⚠️',
            ...options
        });
    }

    /**
     * Show info toast
     */
    info(message, options = {}) {
        const currentUser = authService.getCurrentUser();
        const userRole = currentUser?.accountType || 'guest';

        const enhancedMessage = this.enhanceMessage(message, 'info', userRole, options);

        return toast.success(enhancedMessage, {
            duration: options.duration || this.defaultDuration,
            position: options.position || this.position,
            style: {
                background: '#3B82F6',
                color: 'white',
                fontWeight: '500',
                ...options.style
            },
            icon: options.icon || 'ℹ️',
            ...options
        });
    }

    /**
     * Show loading toast
     */
    loading(message, options = {}) {
        const currentUser = authService.getCurrentUser();
        const userRole = currentUser?.accountType || 'guest';

        const enhancedMessage = this.enhanceMessage(message, 'loading', userRole, options);

        return toast.loading(enhancedMessage, {
            position: options.position || this.position,
            style: {
                background: '#6B7280',
                color: 'white',
                fontWeight: '500',
                ...options.style
            },
            ...options
        });
    }

    /**
     * Enhance message with role-specific context
     */
    enhanceMessage(message, type, userRole, options = {}) {
        if (!options.roleSpecific) {
            return message;
        }

        const roleContext = this.getRoleContext(userRole);
        const guidance = this.getRoleGuidance(type, userRole, options.operation);

        if (guidance) {
            return `${message}\n\n💡 ${guidance}`;
        }

        return message;
    }

    /**
     * Get role context information
     */
    getRoleContext(userRole) {
        const contexts = {
            verifier: {
                name: 'Verifier',
                icon: '🛡️',
                permissions: ['review documents', 'attest documents', 'mint credits']
            },
            business: {
                name: 'Business User',
                icon: '🏢',
                permissions: ['upload documents', 'track projects', 'view credits']
            },
            individual: {
                name: 'Individual User',
                icon: '👤',
                permissions: ['upload documents', 'track submissions', 'view credits']
            },
            guest: {
                name: 'Guest',
                icon: '👋',
                permissions: ['view public information', 'create account']
            }
        };

        return contexts[userRole] || contexts.guest;
    }

    /**
     * Get role-specific guidance
     */
    getRoleGuidance(type, userRole, operation) {
        const guidanceMap = {
            success: {
                verifier: {
                    document_upload: 'Document uploaded successfully. It will appear in your verifier dashboard for review.',
                    attestation: 'Document attested successfully. You can now mint carbon credits for this project.',
                    minting: 'Carbon credits minted successfully. Credits have been allocated to the document uploader.',
                    default: 'Operation completed successfully in your verifier interface.'
                },
                business: {
                    document_upload: 'Business document uploaded successfully. A verifier will review it for attestation.',
                    credit_received: 'Carbon credits have been allocated to your business account.',
                    default: 'Business operation completed successfully.'
                },
                individual: {
                    document_upload: 'Document uploaded successfully. A verifier will review it for attestation.',
                    credit_received: 'Carbon credits have been allocated to your account.',
                    default: 'Operation completed successfully.'
                },
                guest: {
                    registration: 'Account created successfully. You can now upload documents and track credits.',
                    login: 'Logged in successfully. Welcome to the carbon credit platform.',
                    default: 'Welcome! Create an account to access all features.'
                }
            },
            error: {
                verifier: {
                    permission_error: 'Ensure you are using the verifier dashboard and have proper permissions.',
                    blockchain_error: 'Check your wallet connection and ensure you have sufficient gas fees.',
                    default: 'If this continues, check your verifier permissions and wallet connection.'
                },
                business: {
                    upload_error: 'Check your document format and size. Business documents should include project details.',
                    permission_error: 'Business users can upload documents but cannot perform verifications.',
                    default: 'Ensure your business account is properly configured and try again.'
                },
                individual: {
                    upload_error: 'Check your document format and size. Ensure all required project information is included.',
                    permission_error: 'Individual users can upload documents but cannot perform verifications.',
                    default: 'Check your account settings and document requirements.'
                },
                guest: {
                    auth_error: 'Please create an account or log in to access this feature.',
                    default: 'Create an account to access the full carbon credit platform.'
                }
            },
            warning: {
                verifier: {
                    default: 'Review the warning and ensure all verifier requirements are met.'
                },
                business: {
                    default: 'Review the warning and ensure your business documentation is complete.'
                },
                individual: {
                    default: 'Review the warning and ensure your document meets all requirements.'
                },
                guest: {
                    default: 'Consider creating an account for full access to platform features.'
                }
            }
        };

        const typeGuidance = guidanceMap[type] || {};
        const roleGuidance = typeGuidance[userRole] || typeGuidance.guest || {};

        return roleGuidance[operation] || roleGuidance.default;
    }

    /**
     * Document upload status notifications
     */
    documentUploadSuccess(documentName, userRole) {
        const roleMessages = {
            verifier: `Document "${documentName}" uploaded. It's now available in your verifier dashboard.`,
            business: `Business document "${documentName}" uploaded successfully and submitted for verification.`,
            individual: `Document "${documentName}" uploaded successfully and submitted for verification.`,
            guest: 'Document uploaded. Please create an account to track its verification status.'
        };

        const message = roleMessages[userRole] || roleMessages.individual;

        return this.success(message, {
            icon: '📄',
            roleSpecific: true,
            operation: 'document_upload',
            duration: 6000
        });
    }

    documentUploadError(error, userRole) {
        const roleMessages = {
            verifier: 'Document upload failed. Verifiers typically review documents rather than upload them.',
            business: 'Business document upload failed. Please check your file format and project details.',
            individual: 'Document upload failed. Please check your file format and project information.',
            guest: 'Upload failed. Create an account to upload and track documents.'
        };

        const baseMessage = roleMessages[userRole] || roleMessages.individual;
        const fullMessage = `${baseMessage}\n\nError: ${error}`;

        return this.error(fullMessage, {
            icon: '📄❌',
            roleSpecific: true,
            operation: 'upload_error',
            duration: 8000
        });
    }

    /**
     * Document attestation notifications
     */
    documentAttestationSuccess(documentName, userRole) {
        const roleMessages = {
            verifier: `Document "${documentName}" attested successfully. You can now mint carbon credits.`,
            business: `Your business document "${documentName}" has been attested and is ready for minting.`,
            individual: `Your document "${documentName}" has been attested and is ready for minting.`,
            guest: 'Document attested. Create an account to track your document status.'
        };

        const message = roleMessages[userRole] || roleMessages.individual;

        return this.success(message, {
            icon: '✅',
            roleSpecific: true,
            operation: 'attestation',
            duration: 7000
        });
    }

    /**
     * Credit minting notifications
     */
    creditMintingSuccess(amount, recipientRole, documentName) {
        const roleMessages = {
            verifier: `Successfully minted ${amount} carbon credits for "${documentName}". Credits allocated to document uploader.`,
            business: `${amount} carbon credits have been minted for your business project "${documentName}".`,
            individual: `${amount} carbon credits have been minted for your project "${documentName}".`,
            guest: `${amount} carbon credits minted. Create an account to track your credits.`
        };

        const message = roleMessages[recipientRole] || roleMessages.individual;

        return this.success(message, {
            icon: '🪙',
            roleSpecific: true,
            operation: 'minting',
            duration: 8000
        });
    }

    /**
     * Permission error notifications
     */
    permissionError(action, userRole) {
        const roleMessages = {
            verifier: `Verifier permission required for ${action}. Ensure you're using the correct interface.`,
            business: `Business users cannot ${action}. This action requires verifier privileges.`,
            individual: `Individual users cannot ${action}. This action requires verifier privileges.`,
            guest: `Please log in to ${action}. Create an account for full access.`
        };

        const message = roleMessages[userRole] || roleMessages.guest;

        return this.error(message, {
            icon: '🚫',
            roleSpecific: true,
            operation: 'permission_error',
            duration: 6000
        });
    }

    /**
     * Blockchain transaction notifications
     */
    transactionPending(operation, userRole) {
        const roleMessages = {
            verifier: `Verifier ${operation} transaction submitted. Please wait for blockchain confirmation.`,
            business: `Business ${operation} transaction submitted. Please wait for confirmation.`,
            individual: `Your ${operation} transaction submitted. Please wait for confirmation.`,
            guest: `Transaction submitted. Create an account to track transaction status.`
        };

        const message = roleMessages[userRole] || roleMessages.individual;

        return this.loading(message, {
            icon: '⛓️',
            id: `transaction-${operation}`
        });
    }

    transactionSuccess(operation, userRole, transactionHash) {
        const roleMessages = {
            verifier: `Verifier ${operation} completed successfully on blockchain.`,
            business: `Business ${operation} completed successfully.`,
            individual: `Your ${operation} completed successfully.`,
            guest: `${operation} completed. Create an account to track future transactions.`
        };

        const message = roleMessages[userRole] || roleMessages.individual;

        // Dismiss the loading toast
        toast.dismiss(`transaction-${operation}`);

        return this.success(message, {
            icon: '⛓️✅',
            roleSpecific: true,
            operation: 'blockchain_success',
            duration: 7000
        });
    }

    transactionError(operation, error, userRole) {
        const roleMessages = {
            verifier: `Verifier ${operation} failed. Check your wallet connection and gas fees.`,
            business: `Business ${operation} failed. Please try again.`,
            individual: `Your ${operation} failed. Please try again.`,
            guest: `${operation} failed. Create an account for better transaction support.`
        };

        const baseMessage = roleMessages[userRole] || roleMessages.individual;
        const fullMessage = `${baseMessage}\n\nError: ${error}`;

        // Dismiss the loading toast
        toast.dismiss(`transaction-${operation}`);

        return this.error(fullMessage, {
            icon: '⛓️❌',
            roleSpecific: true,
            operation: 'blockchain_error',
            duration: 8000
        });
    }

    /**
     * Role-specific welcome messages
     */
    welcomeMessage(userRole, userName) {
        const welcomeMessages = {
            verifier: `Welcome back, ${userName}! You have verifier privileges to review documents and mint credits.`,
            business: `Welcome back, ${userName}! Upload your business project documents for verification.`,
            individual: `Welcome back, ${userName}! Upload your project documents to earn carbon credits.`,
            guest: 'Welcome! Create an account to upload documents and earn carbon credits.'
        };

        const message = welcomeMessages[userRole] || welcomeMessages.guest;

        return this.info(message, {
            icon: '👋',
            roleSpecific: true,
            operation: 'login',
            duration: 5000
        });
    }

    /**
     * Custom toast with role-aware styling
     */
    custom(content, options = {}) {
        const currentUser = authService.getCurrentUser();
        const userRole = currentUser?.accountType || 'guest';

        return toast.custom(
            (t) => (
                <CustomToast
                    toast={t}
                    content={content}
                    userRole={userRole}
                    {...options}
                />
            ),
            {
                duration: options.duration || this.defaultDuration,
                position: options.position || this.position,
                ...options
            }
        );
    }

    /**
     * Dismiss toast
     */
    dismiss(toastId) {
        return toast.dismiss(toastId);
    }

    /**
     * Dismiss all toasts
     */
    dismissAll() {
        return toast.dismiss();
    }
}

/**
 * Custom Toast Component with Role-Specific Styling
 */
function CustomToast({ toast: t, content, userRole, type = 'info', icon = null }) {
    const getRoleColor = (role) => {
        const colors = {
            verifier: 'from-indigo-500 to-purple-600',
            business: 'from-blue-500 to-cyan-600',
            individual: 'from-green-500 to-emerald-600',
            guest: 'from-gray-500 to-gray-600'
        };
        return colors[role] || colors.guest;
    };

    const getRoleIcon = (role) => {
        const icons = {
            verifier: ShieldCheckIcon,
            business: BuildingOfficeIcon,
            individual: UserIcon,
            guest: UserIcon
        };
        return icons[role] || UserIcon;
    };

    const getTypeIcon = (type) => {
        const icons = {
            success: CheckCircleIcon,
            error: XCircleIcon,
            warning: ExclamationTriangleIcon,
            info: InformationCircleIcon,
            loading: ArrowPathIcon
        };
        return icons[type] || InformationCircleIcon;
    };

    const RoleIcon = getRoleIcon(userRole);
    const TypeIcon = getTypeIcon(type);
    const roleColor = getRoleColor(userRole);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={`max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 ${t.visible ? 'animate-enter' : 'animate-leave'
                }`}
        >
            {/* Role Color Bar */}
            <div className={`w-2 bg-gradient-to-b ${roleColor} rounded-l-lg`} />

            {/* Content */}
            <div className="flex-1 p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 flex items-center space-x-2">
                        {/* Type Icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r ${roleColor}`}>
                            <TypeIcon className="w-4 h-4 text-white" />
                        </div>

                        {/* Role Icon */}
                        <div className="w-6 h-6 text-gray-400">
                            <RoleIcon />
                        </div>
                    </div>

                    <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                            {typeof content === 'string' ? content : content}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 capitalize">
                            {userRole} Account
                        </div>
                    </div>

                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            onClick={() => toast.dismiss(t.id)}
                        >
                            <span className="sr-only">Close</span>
                            <XCircleIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Create and export singleton instance
const toastNotifications = new ToastNotificationService();
export default toastNotifications;