import React from 'react';
import { motion } from 'framer-motion';
import {
    DocumentPlusIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    CreditCardIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';
import { getCurrentUserRole } from '../utils/permissions.js';
import { RoleWelcomeMessage } from './RoleIndicator.jsx';

/**
 * Role-specific landing page component that shows after login
 */
export default function RoleLandingPage({ user, onNavigate }) {
    const userRole = getCurrentUserRole(user);

    const getQuickActions = () => {
        switch (userRole) {
            case 'verifier':
                return [
                    {
                        title: 'Review Documents',
                        description: 'View and verify submitted documents',
                        icon: ShieldCheckIcon,
                        action: 'verifierDashboard',
                        color: 'from-green-500 to-emerald-600'
                    },
                    {
                        title: 'Analytics',
                        description: 'View verification statistics',
                        icon: ChartBarIcon,
                        action: 'analytics',
                        color: 'from-blue-500 to-indigo-600'
                    },
                    {
                        title: 'My Tokens',
                        description: 'View your carbon credits',
                        icon: CreditCardIcon,
                        action: 'tokens',
                        color: 'from-purple-500 to-pink-600'
                    }
                ];

            case 'business':
                return [
                    {
                        title: 'Upload Documents',
                        description: 'Submit business documents for verification',
                        icon: DocumentPlusIcon,
                        action: 'mintCredits',
                        color: 'from-purple-500 to-indigo-600'
                    },
                    {
                        title: 'Portfolio',
                        description: 'View your carbon credit portfolio',
                        icon: ChartBarIcon,
                        action: 'portfolio',
                        color: 'from-blue-500 to-cyan-600'
                    },
                    {
                        title: 'Marketplace',
                        description: 'Buy and sell carbon credits',
                        icon: CreditCardIcon,
                        action: 'market',
                        color: 'from-green-500 to-teal-600'
                    }
                ];

            case 'individual':
            default:
                return [
                    {
                        title: 'Upload Documents',
                        description: 'Submit your environmental impact documents',
                        icon: DocumentPlusIcon,
                        action: 'mintCredits',
                        color: 'from-blue-500 to-cyan-600'
                    },
                    {
                        title: 'My Tokens',
                        description: 'View your earned carbon credits',
                        icon: CreditCardIcon,
                        action: 'tokens',
                        color: 'from-green-500 to-emerald-600'
                    },
                    {
                        title: 'Portfolio',
                        description: 'Track your environmental impact',
                        icon: ChartBarIcon,
                        action: 'portfolio',
                        color: 'from-purple-500 to-pink-600'
                    }
                ];
        }
    };

    const quickActions = getQuickActions();

    return (
        <div className="min-h-screen bg-gradient-to-br from-carbon-50 via-white to-primary-50 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Welcome Message */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <RoleWelcomeMessage user={user} onNavigate={onNavigate} />
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-12"
                >
                    <h3 className="text-xl font-bold text-carbon-900 mb-6 text-center">
                        Quick Actions
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {quickActions.map((action, index) => {
                            const Icon = action.icon;

                            return (
                                <motion.button
                                    key={action.action}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + index * 0.1 }}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onNavigate && onNavigate(action.action)}
                                    className="p-6 bg-white rounded-2xl shadow-lg border border-carbon-200 hover:shadow-xl transition-all duration-200 text-left group"
                                >
                                    <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>

                                    <h4 className="text-lg font-semibold text-carbon-900 mb-2 group-hover:text-primary-700 transition-colors">
                                        {action.title}
                                    </h4>

                                    <p className="text-carbon-600 text-sm mb-4">
                                        {action.description}
                                    </p>

                                    <div className="flex items-center text-primary-600 text-sm font-medium group-hover:text-primary-700 transition-colors">
                                        Get Started
                                        <ArrowRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Role-specific Tips */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl shadow-lg border border-carbon-200 p-6"
                >
                    <h3 className="text-lg font-semibold text-carbon-900 mb-4">
                        {userRole === 'verifier' ? 'Verifier Tips' : 'Getting Started Tips'}
                    </h3>

                    <div className="space-y-3">
                        {userRole === 'verifier' ? (
                            <>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                                    <p className="text-carbon-700 text-sm">
                                        Review documents carefully and verify all required information before attestation.
                                    </p>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                                    <p className="text-carbon-700 text-sm">
                                        Use the dashboard filters to efficiently manage large volumes of documents.
                                    </p>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                                    <p className="text-carbon-700 text-sm">
                                        Credits are automatically allocated to document uploaders after successful minting.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                    <p className="text-carbon-700 text-sm">
                                        Ensure your documents are clear and contain all required project information.
                                    </p>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                    <p className="text-carbon-700 text-sm">
                                        Credits will be automatically allocated to your account after verification.
                                    </p>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                    <p className="text-carbon-700 text-sm">
                                        Track your document status and credit balance in your portfolio.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}