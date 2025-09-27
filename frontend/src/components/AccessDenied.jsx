import React from 'react';
import { motion } from 'framer-motion';
import {
    ExclamationTriangleIcon,
    LockClosedIcon,
    ArrowRightIcon,
    UserIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

/**
 * AccessDenied component for unauthorized access attempts
 * 
 * @param {Object} props
 * @param {string} props.message - Custom access denied message
 * @param {string} props.userRole - Current user's role
 * @param {string} props.attemptedPage - Page user tried to access
 * @param {string[]} props.requiredRoles - Array of roles that have access
 * @param {string[]} props.requiredPermissions - Array of permissions required
 * @param {boolean} props.showLoginButton - Whether to show login button
 * @param {boolean} props.isRedirecting - Whether automatic redirect is in progress
 * @param {Function} props.onLogin - Callback for login action
 * @param {Function} props.onNavigate - Callback for navigation
 */
const AccessDenied = ({
    message = "Access Denied",
    userRole = null,
    attemptedPage = null,
    requiredRoles = [],
    requiredPermissions = [],
    showLoginButton = false,
    isRedirecting = false,
    onLogin = null,
    onNavigate = null
}) => {

    const handleLogin = () => {
        if (onLogin) {
            onLogin();
        } else {
            // Default behavior - could trigger a login modal or redirect
            window.location.reload();
        }
    };

    const handleGoBack = () => {
        if (onNavigate) {
            onNavigate('dashboard');
        } else {
            // Default behavior - go back in history
            window.history.back();
        }
    };

    const getPageDisplayName = (page) => {
        const pageNames = {
            verifierDashboard: 'Verifier Dashboard',
            mintCredits: 'Upload Documents',
            mint: 'Mint Credits',
            tokens: 'My Tokens',
            portfolio: 'Portfolio',
            market: 'Marketplace',
            retire: 'Retire Credits',
            analytics: 'Analytics',
            settings: 'Settings'
        };
        return pageNames[page] || page;
    };

    const getRoleDisplayName = (role) => {
        const roleNames = {
            individual: 'Individual User',
            business: 'Business User',
            verifier: 'Verifier'
        };
        return roleNames[role] || role;
    };

    const getPermissionDisplayName = (permission) => {
        const permissionNames = {
            upload_document: 'Upload Documents',
            view_own_documents: 'View Own Documents',
            view_credits: 'View Credits',
            view_all_documents: 'View All Documents',
            attest_document: 'Attest Documents',
            mint_credits: 'Mint Credits',
            view_verifier_dashboard: 'Access Verifier Dashboard'
        };
        return permissionNames[permission] || permission;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-carbon-50 via-white to-primary-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-w-md w-full"
            >
                <div className="bg-white rounded-2xl shadow-xl border border-carbon-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <LockClosedIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Access Restricted</h1>
                                <p className="text-red-100 text-sm">Insufficient permissions</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Warning Icon and Message */}
                        <div className="text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
                            >
                                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                            </motion.div>

                            <h2 className="text-lg font-semibold text-carbon-900 mb-2">
                                Access Denied
                            </h2>

                            <p className="text-carbon-600 text-sm leading-relaxed">
                                {attemptedPage
                                    ? `You don't have permission to access ${getPageDisplayName(attemptedPage)}.`
                                    : message
                                }
                            </p>

                            {isRedirecting && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-3 p-3 bg-blue-50 rounded-lg"
                                >
                                    <p className="text-blue-700 text-sm">
                                        Redirecting you to an appropriate page...
                                    </p>
                                </motion.div>
                            )}
                        </div>

                        {/* User Role Information */}
                        {userRole && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-carbon-50 rounded-lg p-4"
                            >
                                <div className="flex items-center space-x-2 mb-2">
                                    <UserIcon className="w-4 h-4 text-carbon-500" />
                                    <span className="text-sm font-medium text-carbon-700">Your Role</span>
                                </div>
                                <p className="text-sm text-carbon-600">
                                    {getRoleDisplayName(userRole)}
                                </p>
                            </motion.div>
                        )}

                        {/* Required Roles */}
                        {requiredRoles.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-blue-50 rounded-lg p-4"
                            >
                                <div className="flex items-center space-x-2 mb-2">
                                    <ShieldCheckIcon className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-medium text-blue-700">Required Roles</span>
                                </div>
                                <div className="space-y-1">
                                    {requiredRoles.map((role, index) => (
                                        <p key={index} className="text-sm text-blue-600">
                                            • {getRoleDisplayName(role)}
                                        </p>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Required Permissions */}
                        {requiredPermissions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-purple-50 rounded-lg p-4"
                            >
                                <div className="flex items-center space-x-2 mb-2">
                                    <ShieldCheckIcon className="w-4 h-4 text-purple-500" />
                                    <span className="text-sm font-medium text-purple-700">Required Permissions</span>
                                </div>
                                <div className="space-y-1">
                                    {requiredPermissions.map((permission, index) => (
                                        <p key={index} className="text-sm text-purple-600">
                                            • {getPermissionDisplayName(permission)}
                                        </p>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {showLoginButton && (
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleLogin}
                                    className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                >
                                    <span>Login to Continue</span>
                                    <ArrowRightIcon className="w-4 h-4" />
                                </motion.button>
                            )}

                            {!isRedirecting && (
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: showLoginButton ? 0.7 : 0.6 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleGoBack}
                                    className="w-full bg-carbon-100 hover:bg-carbon-200 text-carbon-700 font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Go to Dashboard
                                </motion.button>
                            )}
                        </div>

                        {/* Help Text */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-center"
                        >
                            <p className="text-xs text-carbon-500">
                                Need help? Contact your administrator to request access.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </motion.div >
        </div >
    );
};

export default AccessDenied;