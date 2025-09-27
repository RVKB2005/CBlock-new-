import { useCallback, useMemo } from "react";
import {
  canAccessPage,
  getRoleBasedLandingPage,
  filterNavigationByPermissions,
  getCurrentUserRole,
  isVerifier,
} from "../utils/permissions.js";
import authService from "../services/auth.js";

/**
 * Custom hook for role-based navigation logic
 * @param {Object} user - Current user object
 * @returns {Object} - Navigation utilities and state
 */
export const useRoleBasedNavigation = (user = null) => {
  const currentUser = user || authService.getCurrentUser();
  const userRole = getCurrentUserRole(currentUser);

  /**
   * Check if user can access a specific page
   */
  const checkPageAccess = useCallback(
    (page) => {
      return canAccessPage(page, currentUser);
    },
    [currentUser]
  );

  /**
   * Navigate to a page with access control
   */
  const navigateWithAccessControl = useCallback(
    (page, onPageChange, onAccessDenied = null) => {
      if (checkPageAccess(page)) {
        onPageChange(page);
      } else {
        if (onAccessDenied) {
          onAccessDenied(page, userRole);
        } else {
          console.warn(`Access denied to page: ${page} for role: ${userRole}`);
        }
      }
    },
    [checkPageAccess, userRole]
  );

  /**
   * Get the appropriate landing page for the user
   */
  const getLandingPage = useCallback(() => {
    return getRoleBasedLandingPage(currentUser);
  }, [currentUser]);

  /**
   * Filter navigation items based on user permissions
   */
  const getFilteredNavigation = useCallback(
    (navigationItems) => {
      return filterNavigationByPermissions(navigationItems, currentUser);
    },
    [currentUser]
  );

  /**
   * Handle role-based redirects
   */
  const handleRoleBasedRedirect = useCallback(
    (currentPage, onPageChange) => {
      // If user is an admin trying to access upload pages, redirect to admin dashboard
      if (
        userRole === "admin" &&
        (currentPage === "mint" || currentPage === "mintCredits")
      ) {
        onPageChange("admin");
        return true;
      }

      // If user is a verifier trying to access upload pages, redirect to verifier dashboard
      if (
        isVerifier(currentUser) &&
        (currentPage === "mint" || currentPage === "mintCredits")
      ) {
        onPageChange("verifierDashboard");
        return true;
      }

      // If non-verifier trying to access verifier dashboard, redirect to regular dashboard
      if (!isVerifier(currentUser) && currentPage === "verifierDashboard") {
        onPageChange("dashboard");
        return true;
      }

      // If non-admin trying to access admin dashboard, redirect to regular dashboard
      if (userRole !== "admin" && currentPage === "admin") {
        onPageChange("dashboard");
        return true;
      }

      // Check if user has access to current page
      if (!checkPageAccess(currentPage)) {
        const landingPage = getLandingPage();
        onPageChange(landingPage);
        return true;
      }

      return false;
    },
    [currentUser, checkPageAccess, getLandingPage, userRole]
  );

  /**
   * Get role-specific navigation configuration
   */
  const getRoleBasedNavigation = useMemo(() => {
    const baseNavigation = [
      {
        name: "Dashboard",
        href: "dashboard",
        icon: "HomeIcon",
        description: "Overview of your portfolio",
        allowedRoles: ["individual", "business", "verifier"],
      },
      {
        name: "My Tokens",
        href: "tokens",
        icon: "WalletIcon",
        description: "View your carbon credits",
        allowedRoles: ["individual", "business", "verifier"],
        requiredPermissions: ["view_credits"],
      },
      {
        name: "Upload Documents",
        href: "mintCredits",
        icon: "PlusCircleIcon",
        description: "Upload documents for verification",
        allowedRoles: ["individual", "business"],
        requiredPermissions: ["upload_document"],
      },
      {
        name: "Verifier Dashboard",
        href: "verifierDashboard",
        icon: "ShieldCheckIcon",
        description: "Review and verify documents",
        allowedRoles: ["verifier"],
        requiredPermissions: ["view_verifier_dashboard"],
      },
      {
        name: "Marketplace",
        href: "market",
        icon: "ShoppingBagIcon",
        description: "Buy and sell credits",
        allowedRoles: ["individual", "business", "verifier"],
      },
      {
        name: "Retire Credits",
        href: "retire",
        icon: "ArrowRightOnRectangleIcon",
        description: "Retire credits for impact",
        allowedRoles: ["individual", "business", "verifier"],
        requiredPermissions: ["view_credits"],
      },
      {
        name: "Analytics",
        href: "analytics",
        icon: "ChartBarIcon",
        description: "Market insights and trends",
        allowedRoles: ["individual", "business", "verifier", "admin"],
      },
      {
        name: "Admin Dashboard",
        href: "admin",
        icon: "ShieldCheckIcon",
        description: "Manage users and system settings",
        allowedRoles: ["admin"],
        requiredPermissions: ["view_admin_dashboard"],
      },
    ];

    return getFilteredNavigation(baseNavigation);
  }, [getFilteredNavigation]);

  /**
   * Get role-specific welcome message
   */
  const getRoleWelcomeMessage = useCallback(() => {
    switch (userRole) {
      case "admin":
        return {
          title: "Welcome to CBlock Admin Dashboard",
          description:
            "Manage users, roles, and system settings for the CBlock platform.",
          primaryAction: "Manage Users",
          primaryActionPage: "admin",
        };
      case "verifier":
        return {
          title: "Welcome to your Verifier Dashboard",
          description:
            "Review and verify documents submitted by users to mint carbon credits.",
          primaryAction: "View Documents",
          primaryActionPage: "verifierDashboard",
        };
      case "business":
        return {
          title: "Welcome to CBlock Business",
          description:
            "Upload your business documents for verification and carbon credit minting.",
          primaryAction: "Upload Documents",
          primaryActionPage: "mintCredits",
        };
      case "individual":
      default:
        return {
          title: "Welcome to CBlock",
          description:
            "Upload your environmental impact documents for verification and carbon credit minting.",
          primaryAction: "Upload Documents",
          primaryActionPage: "mintCredits",
        };
    }
  }, [userRole]);

  /**
   * Check if current page should be accessible to user
   */
  const shouldRedirectFromCurrentPage = useCallback(
    (currentPage) => {
      return !checkPageAccess(currentPage);
    },
    [checkPageAccess]
  );

  return {
    // User info
    userRole,
    currentUser,

    // Access control
    checkPageAccess,
    canAccessPage: checkPageAccess,

    // Navigation
    navigateWithAccessControl,
    getLandingPage,
    getFilteredNavigation,
    getRoleBasedNavigation,

    // Redirects
    handleRoleBasedRedirect,
    shouldRedirectFromCurrentPage,

    // UI helpers
    getRoleWelcomeMessage,

    // Utility functions
    isVerifier: isVerifier(currentUser),
    isIndividual: userRole === "individual",
    isBusiness: userRole === "business",
    isAdmin: userRole === "admin",
  };
};
