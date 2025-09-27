import React from 'react';
import { motion } from 'framer-motion';
import authService from '../services/auth.js';
import AccessDenied from './AccessDenied.jsx';

/**
 * RoleGuard component that checks user permissions before rendering content
 * 
 * @param {Object} props
 * @param {string[]} props.allowedRoles - Array of roles that can access the content
 * @param {string[]} props.requiredPermissions - Array of permissions required to access the content
 * @param {React.ReactNode} props.children - Content to render if access is granted
 * @param {Object} props.user - Current user object (optional, will use authService if not provided)
 * @param {string} props.fallbackMessage - Custom message for access denied (optional)
 * @param {React.ReactNode} props.fallback - Custom fallback component (optional)
 * @param {boolean} props.requireAuthentication - Whether authentication is required (default: true)
 */
const RoleGuard = ({
    allowedRoles = [],
    requiredPermissions = [],
    children,
    user = null,
    fallbackMessage = null,
    fallback = null,
    requireAuthentication = true
}) => {
    // Get current user from auth service if not provided
    const currentUser = user || authService.getCurrentUser();

    // Check if authentication is required and user is not authenticated
    if (requireAuthentication && !authService.isUserAuthenticated()) {
        return fallback || (
            <AccessDenied
                message={fallbackMessage || "Please log in to access this content"}
                showLoginButton={true}
            />
        );
    }

    // If no restrictions are specified, allow access
    if (allowedRoles.length === 0 && requiredPermissions.length === 0) {
        return children;
    }

    // Check role-based access
    if (allowedRoles.length > 0) {
        const userRole = currentUser?.accountType || 'individual';
        if (!allowedRoles.includes(userRole)) {
            return fallback || (
                <AccessDenied
                    message={fallbackMessage || `Access denied. This content requires one of the following roles: ${allowedRoles.join(', ')}`}
                    userRole={userRole}
                    requiredRoles={allowedRoles}
                />
            );
        }
    }

    // Check permission-based access
    if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(permission =>
            authService.hasPermission(permission)
        );

        if (!hasAllPermissions) {
            const userRole = currentUser?.accountType || 'individual';
            return fallback || (
                <AccessDenied
                    message={fallbackMessage || `Access denied. You don't have the required permissions for this content.`}
                    userRole={userRole}
                    requiredPermissions={requiredPermissions}
                />
            );
        }
    }

    // Access granted - render children
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
        >
            {children}
        </motion.div>
    );
};

export default RoleGuard;