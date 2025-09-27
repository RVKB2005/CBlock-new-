import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoleBasedNavigation } from '../hooks/useRoleBasedNavigation.js';
import { canAccessPage, getRoleBasedLandingPage } from '../utils/permissions.js';
import RoleLandingPage from './RoleLandingPage.jsx';
import AccessDenied from './AccessDenied.jsx';

/**
 * Enhanced router component that handles role-based navigation and redirects
 */
export default function RoleBasedRouter({
    user,
    currentPage,
    onPageChange,
    children,
    showLandingPage = false
}) {
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    const {
        checkPageAccess,
        handleRoleBasedRedirect,
        getLandingPage,
        userRole
    } = useRoleBasedNavigation(user);

    // Handle role-based redirects and access control
    useEffect(() => {
        if (!user || !currentPage) return;

        // Check if user has access to current page
        const hasAccess = checkPageAccess(currentPage);

        if (!hasAccess) {
            setAccessDenied(true);

            // Attempt automatic redirect after a brief delay
            const redirectTimer = setTimeout(() => {
                setIsRedirecting(true);
                const landingPage = getLandingPage();

                // Redirect to appropriate landing page
                setTimeout(() => {
                    onPageChange(landingPage);
                    setAccessDenied(false);
                    setIsRedirecting(false);
                }, 1000);
            }, 2000);

            return () => clearTimeout(redirectTimer);
        } else {
            setAccessDenied(false);
            setIsRedirecting(false);
        }
    }, [currentPage, user, checkPageAccess, getLandingPage, onPageChange]);

    // Handle automatic role-based redirects (e.g., verifier accessing upload pages)
    useEffect(() => {
        if (user && currentPage) {
            const wasRedirected = handleRoleBasedRedirect(currentPage, onPageChange);
            if (wasRedirected) {
                console.log(`User redirected from ${currentPage} due to role restrictions`);
            }
        }
    }, [currentPage, user, handleRoleBasedRedirect, onPageChange]);

    // Show landing page for first-time users or when explicitly requested
    if (showLandingPage) {
        return (
            <motion.div
                key="landing-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <RoleLandingPage user={user} onNavigate={onPageChange} />
            </motion.div>
        );
    }

    // Show access denied page with automatic redirect
    if (accessDenied) {
        return (
            <motion.div
                key="access-denied"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <AccessDenied
                    userRole={userRole}
                    attemptedPage={currentPage}
                    isRedirecting={isRedirecting}
                    onNavigate={onPageChange}
                />
            </motion.div>
        );
    }

    // Show normal page content
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}

/**
 * Hook for managing page transitions with role-based access control
 */
export const useRoleBasedRouting = (user, initialPage = 'dashboard') => {
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [navigationHistory, setNavigationHistory] = useState([initialPage]);

    const { checkPageAccess, getLandingPage } = useRoleBasedNavigation(user);

    const navigateToPage = (page, options = {}) => {
        const {
            force = false,
            addToHistory = true,
            onAccessDenied = null
        } = options;

        // Check access unless forced
        if (!force && !checkPageAccess(page)) {
            if (onAccessDenied) {
                onAccessDenied(page);
            } else {
                console.warn(`Access denied to page: ${page}`);
            }
            return false;
        }

        // Update current page
        setCurrentPage(page);

        // Add to navigation history
        if (addToHistory) {
            setNavigationHistory(prev => [...prev, page]);
        }

        return true;
    };

    const goBack = () => {
        if (navigationHistory.length > 1) {
            const newHistory = [...navigationHistory];
            newHistory.pop(); // Remove current page
            const previousPage = newHistory[newHistory.length - 1];

            setNavigationHistory(newHistory);
            setCurrentPage(previousPage);
            return true;
        }
        return false;
    };

    const redirectToLandingPage = () => {
        const landingPage = getLandingPage();
        navigateToPage(landingPage, { force: true, addToHistory: false });
    };

    const canGoBack = navigationHistory.length > 1;

    return {
        currentPage,
        navigationHistory,
        navigateToPage,
        goBack,
        canGoBack,
        redirectToLandingPage,
        setCurrentPage: (page) => navigateToPage(page, { force: true })
    };
};