import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import authService from "../auth.js";

// Mock Web3Auth and other dependencies
const mockWeb3Auth = {
  connect: vi.fn(),
  logout: vi.fn(),
  getUserInfo: vi.fn(),
  getProvider: vi.fn(),
  status: "connected",
};

const mockProvider = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

// Mock ethers
const mockSigner = {
  getAddress: vi.fn(),
  signMessage: vi.fn(),
};

vi.mock("@web3auth/modal", () => ({
  Web3Auth: vi.fn(() => mockWeb3Auth),
}));

vi.mock("ethers", () => ({
  BrowserProvider: vi.fn(() => ({
    getSigner: vi.fn(() => mockSigner),
  })),
}));

describe("Authentication Service Comprehensive Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth service state
    authService.currentUser = null;
    authService.isAuthenticated = false;
    authService.web3auth = mockWeb3Auth;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Role Management", () => {
    const testUsers = {
      individual: {
        email: "individual@example.com",
        name: "John Doe",
        accountType: "individual",
        walletAddress: "0x123...abc",
      },
      business: {
        email: "business@example.com",
        name: "Jane Smith",
        accountType: "business",
        organization: "Green Corp",
        walletAddress: "0x456...def",
      },
      verifier: {
        email: "verifier@example.com",
        name: "Dr. Alice Johnson",
        accountType: "verifier",
        walletAddress: "0x789...ghi",
        verifierCredentials: {
          certificationId: "CERT-12345",
          issuingAuthority: "Global Carbon Council",
        },
      },
    };

    describe("getUserRole", () => {
      it("should return correct role for each user type", () => {
        Object.entries(testUsers).forEach(([expectedRole, userData]) => {
          authService.currentUser = userData;
          expect(authService.getUserRole()).toBe(expectedRole);
        });
      });

      it("should return default role when user has no accountType", () => {
        authService.currentUser = { email: "test@example.com" };
        expect(authService.getUserRole()).toBe("individual");
      });

      it("should return default role when no user is logged in", () => {
        authService.currentUser = null;
        expect(authService.getUserRole()).toBe("individual");
      });

      it("should handle invalid role gracefully", () => {
        authService.currentUser = { accountType: "invalid_role" };
        expect(authService.getUserRole()).toBe("invalid_role");
      });
    });

    describe("isVerifier", () => {
      it("should return true for verifier users", () => {
        authService.currentUser = testUsers.verifier;
        expect(authService.isVerifier()).toBe(true);
      });

      it("should return false for non-verifier users", () => {
        authService.currentUser = testUsers.individual;
        expect(authService.isVerifier()).toBe(false);

        authService.currentUser = testUsers.business;
        expect(authService.isVerifier()).toBe(false);
      });

      it("should return false when no user is logged in", () => {
        authService.currentUser = null;
        expect(authService.isVerifier()).toBe(false);
      });
    });

    describe("hasRole", () => {
      it("should correctly identify user roles", () => {
        Object.entries(testUsers).forEach(([role, userData]) => {
          authService.currentUser = userData;
          expect(authService.hasRole(role)).toBe(true);

          // Should return false for other roles
          const otherRoles = Object.keys(testUsers).filter((r) => r !== role);
          otherRoles.forEach((otherRole) => {
            expect(authService.hasRole(otherRole)).toBe(false);
          });
        });
      });

      it("should handle case-insensitive role checking", () => {
        authService.currentUser = testUsers.verifier;
        expect(authService.hasRole("VERIFIER")).toBe(true);
        expect(authService.hasRole("Verifier")).toBe(true);
        expect(authService.hasRole("verifier")).toBe(true);
      });
    });
  });

  describe("Permission System", () => {
    const rolePermissions = {
      individual: ["upload_document", "view_credits", "view_own_documents"],
      business: [
        "upload_document",
        "view_credits",
        "view_own_documents",
        "manage_organization",
      ],
      verifier: [
        "view_all_documents",
        "attest_document",
        "mint_credits",
        "view_credits",
      ],
    };

    beforeEach(() => {
      // Mock getRolePermissions method
      authService.getRolePermissions = vi.fn(
        (role) => rolePermissions[role] || []
      );
    });

    describe("hasPermission", () => {
      it("should return correct permissions for each role", () => {
        Object.entries(testUsers).forEach(([role, userData]) => {
          authService.currentUser = userData;
          const expectedPermissions = rolePermissions[role];

          expectedPermissions.forEach((permission) => {
            expect(authService.hasPermission(permission)).toBe(true);
          });

          // Test permissions not in the role
          const allPermissions = Object.values(rolePermissions).flat();
          const otherPermissions = allPermissions.filter(
            (p) => !expectedPermissions.includes(p)
          );
          otherPermissions.forEach((permission) => {
            expect(authService.hasPermission(permission)).toBe(false);
          });
        });
      });

      it("should return false for unknown permissions", () => {
        authService.currentUser = testUsers.verifier;
        expect(authService.hasPermission("unknown_permission")).toBe(false);
      });

      it("should return false when no user is logged in", () => {
        authService.currentUser = null;
        expect(authService.hasPermission("upload_document")).toBe(false);
      });

      it("should handle permission checking errors gracefully", () => {
        authService.currentUser = testUsers.individual;
        authService.getRolePermissions.mockImplementation(() => {
          throw new Error("Permission check failed");
        });

        expect(authService.hasPermission("upload_document")).toBe(false);
      });
    });

    describe("hasAnyPermission", () => {
      it("should return true if user has any of the specified permissions", () => {
        authService.currentUser = testUsers.verifier;
        expect(
          authService.hasAnyPermission(["upload_document", "attest_document"])
        ).toBe(true);
      });

      it("should return false if user has none of the specified permissions", () => {
        authService.currentUser = testUsers.individual;
        expect(
          authService.hasAnyPermission(["attest_document", "mint_credits"])
        ).toBe(false);
      });

      it("should handle empty permission array", () => {
        authService.currentUser = testUsers.individual;
        expect(authService.hasAnyPermission([])).toBe(false);
      });
    });

    describe("hasAllPermissions", () => {
      it("should return true if user has all specified permissions", () => {
        authService.currentUser = testUsers.verifier;
        expect(
          authService.hasAllPermissions([
            "view_all_documents",
            "attest_document",
          ])
        ).toBe(true);
      });

      it("should return false if user is missing any permission", () => {
        authService.currentUser = testUsers.individual;
        expect(
          authService.hasAllPermissions(["upload_document", "attest_document"])
        ).toBe(false);
      });

      it("should handle empty permission array", () => {
        authService.currentUser = testUsers.individual;
        expect(authService.hasAllPermissions([])).toBe(true);
      });
    });
  });

  describe("Authentication Flow", () => {
    describe("login", () => {
      it("should successfully log in individual user", async () => {
        mockWeb3Auth.connect.mockResolvedValue(mockProvider);
        mockWeb3Auth.getUserInfo.mockResolvedValue({
          email: "individual@example.com",
          name: "John Doe",
        });
        mockSigner.getAddress.mockResolvedValue("0x123...abc");

        const result = await authService.login("individual");

        expect(result.success).toBe(true);
        expect(authService.currentUser.accountType).toBe("individual");
        expect(authService.currentUser.email).toBe("individual@example.com");
        expect(authService.isAuthenticated).toBe(true);
      });

      it("should successfully log in business user with organization", async () => {
        mockWeb3Auth.connect.mockResolvedValue(mockProvider);
        mockWeb3Auth.getUserInfo.mockResolvedValue({
          email: "business@example.com",
          name: "Jane Smith",
        });
        mockSigner.getAddress.mockResolvedValue("0x456...def");

        const result = await authService.login("business", "Green Corp");

        expect(result.success).toBe(true);
        expect(authService.currentUser.accountType).toBe("business");
        expect(authService.currentUser.organization).toBe("Green Corp");
      });

      it("should successfully log in verifier with credentials", async () => {
        mockWeb3Auth.connect.mockResolvedValue(mockProvider);
        mockWeb3Auth.getUserInfo.mockResolvedValue({
          email: "verifier@example.com",
          name: "Dr. Alice Johnson",
        });
        mockSigner.getAddress.mockResolvedValue("0x789...ghi");

        const verifierCredentials = {
          certificationId: "CERT-12345",
          issuingAuthority: "Global Carbon Council",
        };

        const result = await authService.login(
          "verifier",
          null,
          verifierCredentials
        );

        expect(result.success).toBe(true);
        expect(authService.currentUser.accountType).toBe("verifier");
        expect(authService.currentUser.verifierCredentials).toEqual(
          verifierCredentials
        );
      });

      it("should handle login failures gracefully", async () => {
        mockWeb3Auth.connect.mockRejectedValue(new Error("Connection failed"));

        const result = await authService.login("individual");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Connection failed");
        expect(authService.isAuthenticated).toBe(false);
      });

      it("should validate required fields for business users", async () => {
        const result = await authService.login("business"); // No organization provided

        expect(result.success).toBe(false);
        expect(result.error).toContain("organization");
      });

      it("should validate required fields for verifiers", async () => {
        const result = await authService.login("verifier"); // No credentials provided

        expect(result.success).toBe(false);
        expect(result.error).toContain("credentials");
      });
    });

    describe("logout", () => {
      it("should successfully log out user", async () => {
        // Set up authenticated state
        authService.currentUser = testUsers.individual;
        authService.isAuthenticated = true;

        mockWeb3Auth.logout.mockResolvedValue();

        const result = await authService.logout();

        expect(result.success).toBe(true);
        expect(authService.currentUser).toBe(null);
        expect(authService.isAuthenticated).toBe(false);
      });

      it("should handle logout failures gracefully", async () => {
        authService.currentUser = testUsers.individual;
        authService.isAuthenticated = true;

        mockWeb3Auth.logout.mockRejectedValue(new Error("Logout failed"));

        const result = await authService.logout();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Logout failed");
        // Should still clear local state even if Web3Auth logout fails
        expect(authService.currentUser).toBe(null);
        expect(authService.isAuthenticated).toBe(false);
      });
    });

    describe("session management", () => {
      it("should restore session from localStorage", () => {
        const userData = testUsers.verifier;
        localStorage.setItem("carbonCredit_user", JSON.stringify(userData));
        localStorage.setItem("carbonCredit_isAuthenticated", "true");

        authService.restoreSession();

        expect(authService.currentUser).toEqual(userData);
        expect(authService.isAuthenticated).toBe(true);
      });

      it("should handle corrupted localStorage data", () => {
        localStorage.setItem("carbonCredit_user", "invalid json");
        localStorage.setItem("carbonCredit_isAuthenticated", "true");

        authService.restoreSession();

        expect(authService.currentUser).toBe(null);
        expect(authService.isAuthenticated).toBe(false);
      });

      it("should clear session data on logout", async () => {
        authService.currentUser = testUsers.individual;
        authService.isAuthenticated = true;
        localStorage.setItem(
          "carbonCredit_user",
          JSON.stringify(testUsers.individual)
        );

        mockWeb3Auth.logout.mockResolvedValue();
        await authService.logout();

        expect(localStorage.getItem("carbonCredit_user")).toBe(null);
        expect(localStorage.getItem("carbonCredit_isAuthenticated")).toBe(null);
      });
    });
  });

  describe("Role Transitions", () => {
    it("should handle role upgrade from individual to business", async () => {
      // Start as individual
      authService.currentUser = testUsers.individual;
      authService.isAuthenticated = true;

      const result = await authService.upgradeRole("business", "Green Corp");

      expect(result.success).toBe(true);
      expect(authService.currentUser.accountType).toBe("business");
      expect(authService.currentUser.organization).toBe("Green Corp");
    });

    it("should handle role upgrade from business to verifier", async () => {
      authService.currentUser = testUsers.business;
      authService.isAuthenticated = true;

      const verifierCredentials = {
        certificationId: "CERT-67890",
        issuingAuthority: "Carbon Trust",
      };

      const result = await authService.upgradeRole(
        "verifier",
        null,
        verifierCredentials
      );

      expect(result.success).toBe(true);
      expect(authService.currentUser.accountType).toBe("verifier");
      expect(authService.currentUser.verifierCredentials).toEqual(
        verifierCredentials
      );
    });

    it("should prevent invalid role transitions", async () => {
      authService.currentUser = testUsers.verifier;
      authService.isAuthenticated = true;

      const result = await authService.upgradeRole("individual");

      expect(result.success).toBe(false);
      expect(result.error).toContain("downgrade");
    });

    it("should require authentication for role changes", async () => {
      authService.currentUser = null;
      authService.isAuthenticated = false;

      const result = await authService.upgradeRole("business");

      expect(result.success).toBe(false);
      expect(result.error).toContain("authenticated");
    });
  });

  describe("Security and Validation", () => {
    it("should validate email format during registration", async () => {
      mockWeb3Auth.getUserInfo.mockResolvedValue({
        email: "invalid-email",
        name: "Test User",
      });

      const result = await authService.login("individual");

      expect(result.success).toBe(false);
      expect(result.error).toContain("email");
    });

    it("should validate wallet address format", async () => {
      mockWeb3Auth.connect.mockResolvedValue(mockProvider);
      mockWeb3Auth.getUserInfo.mockResolvedValue({
        email: "test@example.com",
        name: "Test User",
      });
      mockSigner.getAddress.mockResolvedValue("invalid-address");

      const result = await authService.login("individual");

      expect(result.success).toBe(false);
      expect(result.error).toContain("wallet");
    });

    it("should sanitize user input data", async () => {
      mockWeb3Auth.connect.mockResolvedValue(mockProvider);
      mockWeb3Auth.getUserInfo.mockResolvedValue({
        email: "test@example.com",
        name: '<script>alert("xss")</script>',
      });
      mockSigner.getAddress.mockResolvedValue("0x123...abc");

      const result = await authService.login("individual");

      expect(result.success).toBe(true);
      expect(authService.currentUser.name).not.toContain("<script>");
    });

    it("should handle concurrent login attempts", async () => {
      mockWeb3Auth.connect.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockProvider), 100))
      );
      mockWeb3Auth.getUserInfo.mockResolvedValue({
        email: "test@example.com",
        name: "Test User",
      });
      mockSigner.getAddress.mockResolvedValue("0x123...abc");

      // Start two login attempts simultaneously
      const login1 = authService.login("individual");
      const login2 = authService.login("business", "Test Corp");

      const [result1, result2] = await Promise.all([login1, login2]);

      // Only one should succeed
      expect([result1.success, result2.success].filter(Boolean)).toHaveLength(
        1
      );
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle network errors during authentication", async () => {
      mockWeb3Auth.connect.mockRejectedValue(new Error("Network error"));

      const result = await authService.login("individual");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
      expect(authService.isAuthenticated).toBe(false);
    });

    it("should handle Web3Auth initialization errors", async () => {
      authService.web3auth = null;

      const result = await authService.login("individual");

      expect(result.success).toBe(false);
      expect(result.error).toContain("initialization");
    });

    it("should recover from corrupted user state", () => {
      // Simulate corrupted state
      authService.currentUser = { invalidData: true };
      authService.isAuthenticated = true;

      const role = authService.getUserRole();
      const hasPermission = authService.hasPermission("upload_document");

      expect(role).toBe("individual"); // Should default gracefully
      expect(hasPermission).toBe(false); // Should deny access safely
    });

    it("should handle permission check failures gracefully", () => {
      authService.currentUser = testUsers.individual;
      authService.getRolePermissions = vi.fn(() => {
        throw new Error("Permission system error");
      });

      const hasPermission = authService.hasPermission("upload_document");
      const hasAnyPermission = authService.hasAnyPermission([
        "upload_document",
      ]);
      const hasAllPermissions = authService.hasAllPermissions([
        "upload_document",
      ]);

      expect(hasPermission).toBe(false);
      expect(hasAnyPermission).toBe(false);
      expect(hasAllPermissions).toBe(false);
    });
  });

  describe("Event Handling", () => {
    it("should emit events on successful login", async () => {
      const loginHandler = vi.fn();
      authService.on("login", loginHandler);

      mockWeb3Auth.connect.mockResolvedValue(mockProvider);
      mockWeb3Auth.getUserInfo.mockResolvedValue({
        email: "test@example.com",
        name: "Test User",
      });
      mockSigner.getAddress.mockResolvedValue("0x123...abc");

      await authService.login("individual");

      expect(loginHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          accountType: "individual",
          email: "test@example.com",
        })
      );
    });

    it("should emit events on logout", async () => {
      const logoutHandler = vi.fn();
      authService.on("logout", logoutHandler);

      authService.currentUser = testUsers.individual;
      authService.isAuthenticated = true;

      mockWeb3Auth.logout.mockResolvedValue();
      await authService.logout();

      expect(logoutHandler).toHaveBeenCalled();
    });

    it("should emit events on role changes", async () => {
      const roleChangeHandler = vi.fn();
      authService.on("roleChange", roleChangeHandler);

      authService.currentUser = testUsers.individual;
      authService.isAuthenticated = true;

      await authService.upgradeRole("business", "Test Corp");

      expect(roleChangeHandler).toHaveBeenCalledWith({
        oldRole: "individual",
        newRole: "business",
        user: expect.objectContaining({ accountType: "business" }),
      });
    });
  });
});
