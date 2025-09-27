import authService from "../services/auth.js";

/**
 * Permission checking utilities for frontend components
 */

// Available permissions in the system
export const PERMISSIONS = {
  UPLOAD_DOCUMENT: "upload_document",
  VIEW_OWN_DOCUMENTS: "view_own_documents",
  VIEW_CREDITS: "view_credits",
  VIEW_ALL_DOCUMENTS: "view_all_documents",
  ATTEST_DOCUMENT: "attest_document",
  MINT_CREDITS: "mint_credits",
  VIEW_VERIFIER_DASHBOARD: "view_verifier_dashboard",
  MANAGE_USERS: "manage_users",
  CHANGE_USER_ROLES: "change_user_roles",
  VIEW_AUDIT_LOGS: "view_audit_logs",
  MANAGE_VERIFIER_CREDENTIALS: "manage_verifier_credentials",
  BACKUP_RESTORE_DATA: "backup_restore_data",
  VIEW_ADMIN_DASHBOARD: "view_admin_dashboard",
};

// Available roles in the system
export const ROLES = {
  INDIVIDUAL: "individual",
  BUSINESS: "business",
  VERIFIER: "verifier",
  ADMIN: "admin",
};

// Role-based page access configuration
export const PAGE_ACCESS = {
  dashboard: {
    allowedRoles: [
      ROLES.INDIVIDUAL,
      ROLES.BUSINESS,
      ROLES.VERIFIER,
      ROLES.ADMIN,
    ],
    requiredPermissions: [],
  },
  tokens: {
    allowedRoles: [
      ROLES.INDIVIDUAL,
      ROLES.BUSINESS,
      ROLES.VERIFIER,
      ROLES.ADMIN,
    ],
    requiredPermissions: [PERMISSIONS.VIEW_CREDITS],
  },
  mint: {
    allowedRoles: [ROLES.INDIVIDUAL, ROLES.BUSINESS], // Only non-verifiers can upload
    requiredPermissions: [PERMISSIONS.UPLOAD_DOCUMENT],
  },
  mintCredits: {
    allowedRoles: [ROLES.INDIVIDUAL, ROLES.BUSINESS], // Only non-verifiers can upload
    requiredPermissions: [PERMISSIONS.UPLOAD_DOCUMENT],
  },
  verifierDashboard: {
    allowedRoles: [ROLES.VERIFIER],
    requiredPermissions: [
      PERMISSIONS.VIEW_VERIFIER_DASHBOARD,
      PERMISSIONS.VIEW_ALL_DOCUMENTS,
    ],
  },
  market: {
    allowedRoles: [
      ROLES.INDIVIDUAL,
      ROLES.BUSINESS,
      ROLES.VERIFIER,
      ROLES.ADMIN,
    ],
    requiredPermissions: [],
  },
  retire: {
    allowedRoles: [
      ROLES.INDIVIDUAL,
      ROLES.BUSINESS,
      ROLES.VERIFIER,
      ROLES.ADMIN,
    ],
    requiredPermissions: [PERMISSIONS.VIEW_CREDITS],
  },
  analytics: {
    allowedRoles: [
      ROLES.INDIVIDUAL,
      ROLES.BUSINESS,
      ROLES.VERIFIER,
      ROLES.ADMIN,
    ],
    requiredPermissions: [],
  },
  settings: {
    allowedRoles: [
      ROLES.INDIVIDUAL,
      ROLES.BUSINESS,
      ROLES.VERIFIER,
      ROLES.ADMIN,
    ],
    requiredPermissions: [],
  },
  portfolio: {
    allowedRoles: [
      ROLES.INDIVIDUAL,
      ROLES.BUSINESS,
      ROLES.VERIFIER,
      ROLES.ADMIN,
    ],
    requiredPermissions: [PERMISSIONS.VIEW_CREDITS],
  },
  admin: {
    allowedRoles: [ROLES.ADMIN],
    requiredPermissions: [PERMISSIONS.VIEW_ADMIN_DASHBOARD],
  },
};

/**
 * Check if current user has permission to access a specific page
 * @param {string} page - Page identifier
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {boolean} - Whether user has access
 */
export const canAccessPage = (page, user = null) => {
  const currentUser = user || authService.getCurrentUser();
  const pageConfig = PAGE_ACCESS[page];

  if (!pageConfig) {
    // If page is not configured, allow access by default
    return true;
  }

  // Check if user is authenticated
  if (!authService.isUserAuthenticated()) {
    return false;
  }

  const userRole = currentUser?.accountType || ROLES.INDIVIDUAL;

  // Check role-based access
  if (
    pageConfig.allowedRoles.length > 0 &&
    !pageConfig.allowedRoles.includes(userRole)
  ) {
    return false;
  }

  // Check permission-based access
  if (pageConfig.requiredPermissions.length > 0) {
    return pageConfig.requiredPermissions.every((permission) =>
      authService.hasPermission(permission)
    );
  }

  return true;
};

/**
 * Check if current user has a specific permission
 * @param {string} permission - Permission to check
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {boolean} - Whether user has the permission
 */
export const hasPermission = (permission, user = null) => {
  return authService.hasPermission(permission);
};

/**
 * Check if current user has any of the specified permissions
 * @param {string[]} permissions - Array of permissions to check
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {boolean} - Whether user has any of the permissions
 */
export const hasAnyPermission = (permissions, user = null) => {
  return permissions.some((permission) => hasPermission(permission, user));
};

/**
 * Check if current user has all of the specified permissions
 * @param {string[]} permissions - Array of permissions to check
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {boolean} - Whether user has all of the permissions
 */
export const hasAllPermissions = (permissions, user = null) => {
  return permissions.every((permission) => hasPermission(permission, user));
};

/**
 * Check if current user has a specific role
 * @param {string} role - Role to check
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {boolean} - Whether user has the role
 */
export const hasRole = (role, user = null) => {
  const currentUser = user || authService.getCurrentUser();
  const userRole = currentUser?.accountType || ROLES.INDIVIDUAL;
  return userRole === role;
};

/**
 * Check if current user has any of the specified roles
 * @param {string[]} roles - Array of roles to check
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {boolean} - Whether user has any of the roles
 */
export const hasAnyRole = (roles, user = null) => {
  return roles.some((role) => hasRole(role, user));
};

/**
 * Get the current user's role
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {string} - User's role
 */
export const getCurrentUserRole = (user = null) => {
  const currentUser = user || authService.getCurrentUser();
  return currentUser?.accountType || ROLES.INDIVIDUAL;
};

/**
 * Get permissions for the current user's role
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {string[]} - Array of permissions
 */
export const getCurrentUserPermissions = (user = null) => {
  const role = getCurrentUserRole(user);
  return authService.getRolePermissions(role);
};

/**
 * Check if current user is a verifier
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {boolean} - Whether user is a verifier
 */
export const isVerifier = (user = null) => {
  return hasRole(ROLES.VERIFIER, user);
};

/**
 * Check if current user is an individual
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {boolean} - Whether user is an individual
 */
export const isIndividual = (user = null) => {
  return hasRole(ROLES.INDIVIDUAL, user);
};

/**
 * Check if current user is a business
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {boolean} - Whether user is a business
 */
export const isBusiness = (user = null) => {
  return hasRole(ROLES.BUSINESS, user);
};

/**
 * Check if current user is an admin
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {boolean} - Whether user is an admin
 */
export const isAdmin = (user = null) => {
  return hasRole(ROLES.ADMIN, user);
};

/**
 * Get the redirect page for a user based on their role
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {string} - Page to redirect to
 */
export const getRoleBasedLandingPage = (user = null) => {
  const role = getCurrentUserRole(user);

  switch (role) {
    case ROLES.ADMIN:
      return "admin";
    case ROLES.VERIFIER:
      return "verifierDashboard";
    case ROLES.INDIVIDUAL:
    case ROLES.BUSINESS:
      return "dashboard";
    default:
      return "dashboard";
  }
};

/**
 * Filter navigation items based on user permissions
 * @param {Array} navigationItems - Array of navigation items
 * @param {Object} user - User object (optional, will use current user if not provided)
 * @returns {Array} - Filtered navigation items
 */
export const filterNavigationByPermissions = (navigationItems, user = null) => {
  return navigationItems.filter((item) => {
    // If item has no access restrictions, include it
    if (!item.allowedRoles && !item.requiredPermissions) {
      return true;
    }

    // Check role-based access
    if (item.allowedRoles && item.allowedRoles.length > 0) {
      if (!hasAnyRole(item.allowedRoles, user)) {
        return false;
      }
    }

    // Check permission-based access
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      if (!hasAllPermissions(item.requiredPermissions, user)) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Get user-friendly role display name
 * @param {string} role - Role identifier
 * @returns {string} - Display name for the role
 */
export const getRoleDisplayName = (role) => {
  const roleNames = {
    [ROLES.INDIVIDUAL]: "Individual User",
    [ROLES.BUSINESS]: "Business User",
    [ROLES.VERIFIER]: "Verifier",
    [ROLES.ADMIN]: "Administrator",
  };
  return roleNames[role] || role;
};

/**
 * Get user-friendly permission display name
 * @param {string} permission - Permission identifier
 * @returns {string} - Display name for the permission
 */
export const getPermissionDisplayName = (permission) => {
  const permissionNames = {
    [PERMISSIONS.UPLOAD_DOCUMENT]: "Upload Documents",
    [PERMISSIONS.VIEW_OWN_DOCUMENTS]: "View Own Documents",
    [PERMISSIONS.VIEW_CREDITS]: "View Credits",
    [PERMISSIONS.VIEW_ALL_DOCUMENTS]: "View All Documents",
    [PERMISSIONS.ATTEST_DOCUMENT]: "Attest Documents",
    [PERMISSIONS.MINT_CREDITS]: "Mint Credits",
    [PERMISSIONS.VIEW_VERIFIER_DASHBOARD]: "Access Verifier Dashboard",
    [PERMISSIONS.MANAGE_USERS]: "Manage Users",
    [PERMISSIONS.CHANGE_USER_ROLES]: "Change User Roles",
    [PERMISSIONS.VIEW_AUDIT_LOGS]: "View Audit Logs",
    [PERMISSIONS.MANAGE_VERIFIER_CREDENTIALS]: "Manage Verifier Credentials",
    [PERMISSIONS.BACKUP_RESTORE_DATA]: "Backup & Restore Data",
    [PERMISSIONS.VIEW_ADMIN_DASHBOARD]: "Access Admin Dashboard",
  };
  return permissionNames[permission] || permission;
};
