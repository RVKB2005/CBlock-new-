import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

/**
 * Breadcrumb navigation component for role-based workflows
 */
export default function Breadcrumb({ items = [], onNavigate, className = '' }) {
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center space-x-2 text-sm ${className}`}
            aria-label="Breadcrumb"
        >
            <ol className="flex items-center space-x-2">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    const isFirst = index === 0;

                    return (
                        <li key={item.href || index} className="flex items-center">
                            {index > 0 && (
                                <ChevronRightIcon className="w-4 h-4 text-carbon-400 mx-2" />
                            )}

                            {isLast ? (
                                <span className="text-carbon-900 font-medium flex items-center">
                                    {isFirst && item.icon === 'home' && (
                                        <HomeIcon className="w-4 h-4 mr-1" />
                                    )}
                                    {item.label}
                                </span>
                            ) : (
                                <button
                                    onClick={() => onNavigate && onNavigate(item.href)}
                                    className="text-carbon-600 hover:text-carbon-900 transition-colors flex items-center hover:underline"
                                >
                                    {isFirst && item.icon === 'home' && (
                                        <HomeIcon className="w-4 h-4 mr-1" />
                                    )}
                                    {item.label}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ol>
        </motion.nav>
    );
}

/**
 * Hook to generate breadcrumb items based on current page and user role
 */
export const useBreadcrumb = (currentPage, userRole) => {
    const getBreadcrumbItems = () => {
        const items = [
            { label: 'Dashboard', href: 'dashboard', icon: 'home' }
        ];

        switch (currentPage) {
            case 'verifierDashboard':
                return [
                    ...items,
                    { label: 'Verifier Dashboard', href: 'verifierDashboard' }
                ];

            case 'mintCredits':
                if (userRole === 'verifier') {
                    return [
                        ...items,
                        { label: 'Verifier Dashboard', href: 'verifierDashboard' },
                        { label: 'Upload Documents', href: 'mintCredits' }
                    ];
                }
                return [
                    ...items,
                    { label: 'Upload Documents', href: 'mintCredits' }
                ];

            case 'tokens':
                return [
                    ...items,
                    { label: 'My Tokens', href: 'tokens' }
                ];

            case 'portfolio':
                return [
                    ...items,
                    { label: 'Portfolio', href: 'portfolio' }
                ];

            case 'market':
                return [
                    ...items,
                    { label: 'Marketplace', href: 'market' }
                ];

            case 'retire':
                return [
                    ...items,
                    { label: 'Retire Credits', href: 'retire' }
                ];

            case 'analytics':
                return [
                    ...items,
                    { label: 'Analytics', href: 'analytics' }
                ];

            case 'settings':
                return [
                    ...items,
                    { label: 'Settings', href: 'settings' }
                ];

            default:
                return items;
        }
    };

    return getBreadcrumbItems();
};