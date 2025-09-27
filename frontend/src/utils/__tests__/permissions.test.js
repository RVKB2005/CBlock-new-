import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canAccessPage,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  getCurrentUserRole,
  getCurrentUserPermissions,
  isVerifier,
  isIndividual,
  isBusiness,
  getRoleBasedLandingPage,
  filterNavigationByPermissions,
  getRoleDisplayName,
  getPermissionDisplayName,
  ROLES,
  PERMISSIONS,
  PAGE_ACCESS,
} from "../permissions.js";
import authService from "../../services/auth.js";

// Mock the auth service
vi.mock("../../services/auth.js", () => ({
  default: {
    getCurrentUser: vi.fn(),
    isUserAuthenticated: vi.fn(),
    hasPermission: vi.fn(),
    getRolePermissions: vi.fn(),
  },
}));

describe("Permission Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canAccessPage", () => {
    it("should allow access to unconfigured pages", () => {
      authService.isUserAuthenticated.mockReturnValue(true);
      const result = canAccessPage("nonexistent-page");
      expect(result).toBe(true);
    });

    it("should deny access when user is not authenticated", () => {
      authService.isUserAuthenticated.mockReturnValue(false);
      const result = canAccessPage("dashboard");
      expect(result).toBe(false);
    });

    it("should allow access for correct role", () => {
      authService.isUserAuthenticated.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue({ accountType: "verifier" });
      authService.hasPermission.mockReturnValue(true); // Mock permission check

      const result = canAccessPage("verifierDashboard");
      expect(result).toBe(true);
    });

    it("should deny access for incorrect role", () => {
      authService.isUserAuthenticated.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue({ accountType: "individual" });

      const result = canAccessPage("verifierDashboard");
      expect(result).toBe(false);
    });

    it("should check permissions when required", () => {
      authService.isUserAuthenticated.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue({ accountType: "individual" });
      authService.hasPermission.mockReturnValue(true);

      const result = canAccessPage("tokens");
      expect(result).toBe(true);
      expect(authService.hasPermission).toHaveBeenCalledWith("view_credits");
    });
  });

  describe("Role Checking Functions", () => {
    it("should correctly identify verifier role", () => {
      const verifierUser = { accountType: "verifier" };
      expect(hasRole("verifier", verifierUser)).toBe(true);
      expect(isVerifier(verifierUser)).toBe(true);
      expect(isIndividual(verifierUser)).toBe(false);
      expect(isBusiness(verifierUser)).toBe(false);
    });

    it("should correctly identify individual role", () => {
      const individualUser = { accountType: "individual" };
      expect(hasRole("individual", individualUser)).toBe(true);
      expect(isIndividual(individualUser)).toBe(true);
      expect(isVerifier(individualUser)).toBe(false);
      expect(isBusiness(individualUser)).toBe(false);
    });

    it("should correctly identify business role", () => {
      const businessUser = { accountType: "business" };
      expect(hasRole("business", businessUser)).toBe(true);
      expect(isBusiness(businessUser)).toBe(true);
      expect(isVerifier(businessUser)).toBe(false);
      expect(isIndividual(businessUser)).toBe(false);
    });

    it("should handle multiple role checking", () => {
      const individualUser = { accountType: "individual" };
      expect(hasAnyRole(["individual", "business"], individualUser)).toBe(true);
      expect(hasAnyRole(["verifier"], individualUser)).toBe(false);
    });

    it("should default to individual role when no role specified", () => {
      const userWithoutRole = {};
      expect(getCurrentUserRole(userWithoutRole)).toBe("individual");
    });
  });

  describe("Permission Checking Functions", () => {
    it("should delegate to auth service for permission checking", () => {
      authService.hasPermission.mockReturnValue(true);

      const result = hasPermission("upload_document");
      expect(result).toBe(true);
      expect(authService.hasPermission).toHaveBeenCalledWith("upload_document");
    });

    it("should check any permission correctly", () => {
      authService.hasPermission
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const result = hasAnyPermission(["upload_document", "view_credits"]);
      expect(result).toBe(true);
    });

    it("should check all permissions correctly", () => {
      authService.hasPermission
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const result = hasAllPermissions(["upload_document", "view_credits"]);
      expect(result).toBe(false);
    });

    it("should get current user permissions", () => {
      const mockPermissions = ["upload_document", "view_credits"];
      authService.getCurrentUser.mockReturnValue({ accountType: "individual" });
      authService.getRolePermissions.mockReturnValue(mockPermissions);

      const result = getCurrentUserPermissions();
      expect(result).toEqual(mockPermissions);
      expect(authService.getRolePermissions).toHaveBeenCalledWith("individual");
    });
  });

  describe("Role-Based Landing Page", () => {
    it("should return verifier dashboard for verifiers", () => {
      const verifierUser = { accountType: "verifier" };
      expect(getRoleBasedLandingPage(verifierUser)).toBe("verifierDashboard");
    });

    it("should return dashboard for individual users", () => {
      const individualUser = { accountType: "individual" };
      expect(getRoleBasedLandingPage(individualUser)).toBe("dashboard");
    });

    it("should return dashboard for business users", () => {
      const businessUser = { accountType: "business" };
      expect(getRoleBasedLandingPage(businessUser)).toBe("dashboard");
    });

    it("should return dashboard for unknown roles", () => {
      const unknownUser = { accountType: "unknown" };
      expect(getRoleBasedLandingPage(unknownUser)).toBe("dashboard");
    });
  });

  describe("Navigation Filtering", () => {
    const mockNavigation = [
      {
        name: "Dashboard",
        href: "dashboard",
      },
      {
        name: "Upload",
        href: "upload",
        allowedRoles: ["individual", "business"],
      },
      {
        name: "Verifier Dashboard",
        href: "verifier",
        allowedRoles: ["verifier"],
        requiredPermissions: ["view_all_documents"],
      },
    ];

    it("should include items with no restrictions", () => {
      const individualUser = { accountType: "individual" };
      const filtered = filterNavigationByPermissions(
        mockNavigation,
        individualUser
      );

      expect(filtered).toContainEqual(
        expect.objectContaining({ name: "Dashboard" })
      );
    });

    it("should filter by role correctly", () => {
      const individualUser = { accountType: "individual" };
      const filtered = filterNavigationByPermissions(
        mockNavigation,
        individualUser
      );

      expect(filtered).toContainEqual(
        expect.objectContaining({ name: "Upload" })
      );
      expect(filtered).not.toContainEqual(
        expect.objectContaining({ name: "Verifier Dashboard" })
      );
    });

    it("should filter by permissions correctly", () => {
      authService.hasPermission.mockReturnValue(false);
      const verifierUser = { accountType: "verifier" };
      const filtered = filterNavigationByPermissions(
        mockNavigation,
        verifierUser
      );

      expect(filtered).not.toContainEqual(
        expect.objectContaining({ name: "Verifier Dashboard" })
      );
    });
  });

  describe("Display Name Functions", () => {
    it("should return correct role display names", () => {
      expect(getRoleDisplayName("individual")).toBe("Individual User");
      expect(getRoleDisplayName("business")).toBe("Business User");
      expect(getRoleDisplayName("verifier")).toBe("Verifier");
      expect(getRoleDisplayName("unknown")).toBe("unknown");
    });

    it("should return correct permission display names", () => {
      expect(getPermissionDisplayName("upload_document")).toBe(
        "Upload Documents"
      );
      expect(getPermissionDisplayName("view_all_documents")).toBe(
        "View All Documents"
      );
      expect(getPermissionDisplayName("attest_document")).toBe(
        "Attest Documents"
      );
      expect(getPermissionDisplayName("unknown")).toBe("unknown");
    });
  });

  describe("Constants", () => {
    it("should export correct role constants", () => {
      expect(ROLES.INDIVIDUAL).toBe("individual");
      expect(ROLES.BUSINESS).toBe("business");
      expect(ROLES.VERIFIER).toBe("verifier");
    });

    it("should export correct permission constants", () => {
      expect(PERMISSIONS.UPLOAD_DOCUMENT).toBe("upload_document");
      expect(PERMISSIONS.VIEW_ALL_DOCUMENTS).toBe("view_all_documents");
      expect(PERMISSIONS.ATTEST_DOCUMENT).toBe("attest_document");
    });

    it("should have page access configuration", () => {
      expect(PAGE_ACCESS.dashboard).toBeDefined();
      expect(PAGE_ACCESS.verifierDashboard).toBeDefined();
      expect(PAGE_ACCESS.mintCredits).toBeDefined();
    });
  });
});
