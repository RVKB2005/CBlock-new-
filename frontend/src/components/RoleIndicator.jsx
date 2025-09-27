import React from 'react';
import { motion } from 'framer-motion';
import {
    UserIcon,
    BuildingOfficeIcon,
    ShieldCheckIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import { getRoleDisplayName, getCurrentUserRole, getCurrentUserPermissions } from '../utils/permissions.js';

/**
 * Visual indicator showing current user role and permissions
 */
export default function RoleIndicator({ user, showPermissions = false, compact = false }) {
    const userRole = getCurrentUserRole(user);
    const permissions = getCurrentUserPermissions(user);
    const roleDisplayName = getRoleDisplayName(userRole);

    const getRoleIcon = () => {
        switch (userRole) {
            case 'individual':
                return UserIcon;
            case 'business':
                return BuildingOfficeIcon;
            case 'verifier':
                return ShieldCheckIcon;
            default:
                return UserIcon;
        }
    };

    const getRoleColor = () => {
        switch (userRole) {
            case 'individual':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'business':
                return 'text-purple-600 bg-purple-50 border-purple-200';
            case 'verifier':
                return 'text-green-600 bg-green-50 border-green-200';
            default:
                return 'text-carbon-600 bg-carbon-50 border-carbon-200';
        }
    };

    const RoleIcon = getRoleIcon();

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getRoleColor()}`}
                title={`Role: ${roleDisplayName}`}
            >
                <RoleIcon className="w-3 h-3 mr-1" />
                {roleDisplayName}
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg border ${getRoleColor()}`}
        >
            <div className="flex items-center space-x-2">
                <RoleIcon className="w-5 h-5" />
                <div className="flex-1">
                    <h4 className="font-semibold text-sm">Current Role</h4>
                    <p className="text-xs opacity-80">{roleDisplayName}</p>
                </div>
                {showPermissions && (
                    <button
                        className="p-1 hover:bg-black/5 rounded transition-colors"
                        title="View permissions"
                    >
                        <InformationCircleIcon className="w-4 h-4" />
                    </button>
                )}
            </div>

            {showPermissions && permissions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-current/20"
                >
                    <h5 className="text-xs font-medium mb-2">Permissions:</h5>
                    <div className="flex flex-wrap gap-1">
                        {permissions.map((permission) => (
                            <span
                                key={permission}
                                className="text-xs px-2 py-1 bg-black/10 rounded-full"
                            >
                                {permission.replace(/_/g, ' ').toLowerCase()}
                            </span>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

/**
 * Compact role badge for navigation areas
 */
export function RoleBadge({ user, className = '' }) {
    return (
        <RoleIndicator
            user={user}
            compact={true}
            className={className}
        />
    );
}

/**
 * Role-specific welcome message component
 */
export function RoleWelcomeMessage({ user, onNavigate }) {
    const userRole = getCurrentUserRole(user);

    const getRoleMessage = () => {
        switch (userRole) {
            case 'verifier':
                return {
                    title: 'Welcome to your Verifier Dashboard',
                    description: 'Review and verify documents submitted by users to mint carbon credits.',
                    primaryAction: 'View Documents',
                    primaryActionPage: 'verifierDashboard',
                    icon: ShieldCheckIcon,
                    gradient: 'from-green-500 to-emerald-600'
                };
            case 'business':
                return {
                    title: 'Welcome to CBlock Business',
                    description: 'Upload your business documents for verification and carbon credit minting.',
                    primaryAction: 'Upload Documents',
                    primaryActionPage: 'mintCredits',
                    icon: BuildingOfficeIcon,
                    gradient: 'from-purple-500 to-indigo-600'
                };
            case 'individual':
            default:
                return {
                    title: 'Welcome to CBlock',
                    description: 'Upload your environmental impact documents for verification and carbon credit minting.',
                    primaryAction: 'Upload Documents',
                    primaryActionPage: 'mintCredits',
                    icon: UserIcon,
                    gradient: 'from-blue-500 to-cyan-600'
                };
        }
    };

    const message = getRoleMessage();
    const Icon = message.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-8 bg-white rounded-2xl shadow-lg border border-carbon-200"
        >
            <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-r ${message.gradient} rounded-2xl flex items-center justify-center`}>
                <Icon className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-carbon-900 mb-2">
                {message.title}
            </h2>

            <p className="text-carbon-600 mb-6 max-w-md mx-auto">
                {message.description}
            </p>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate && onNavigate(message.primaryActionPage)}
                className={`inline-flex items-center px-6 py-3 bg-gradient-to-r ${message.gradient} text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200`}
            >
                <Icon className="w-5 h-5 mr-2" />
                {message.primaryAction}
            </motion.button>
        </motion.div>
    );
}