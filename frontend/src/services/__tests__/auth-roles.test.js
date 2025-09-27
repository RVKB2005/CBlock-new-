import authService from "../auth.js";

describe("AuthService Role Management", () => {
  beforeEach(() => {
    // Clear any existing users and authentication state
    authService.logout();
    authService.users.clear();
    localStorage.clear();
  });

  describe("Role Validation", () => {
    test("validates valid account types", () => {
      const validTypes = ["individual", "business", "verifier"];

      validTypes.forEach((type) => {
        const result = authService.validateAccountType(type);
        expect(result.valid).toBe(true);
        expect(result.accountType).toBe(type);
      });
    });

    test("rejects invalid account types", () => {
      const result = authService.validateAccountType("invalid");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid account type");
    });

    test("defaults to individual when no account type provided", () => {
      const result = authService.validateAccountType();
      expect(result.valid).toBe(true);
      expect(result.accountType).toBe("individual");
    });
  });

  describe("User Registration with Roles", () => {
    test("registers user with valid account type", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "password123",
        confirmPassword: "password123",
        accountType: "business",
      };

      const user = await authService.register(userData);
      expect(user.accountType).toBe("business");
    });

    test("registers user with default account type when none provided", async () => {
      const userData = {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        password: "password123",
        confirmPassword: "password123",
      };

      const user = await authService.register(userData);
      expect(user.accountType).toBe("individual");
    });

    test("throws error for invalid account type", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "password123",
        confirmPassword: "password123",
        accountType: "invalid",
      };

      await expect(authService.register(userData)).rejects.toThrow(
        "Invalid account type"
      );
    });
  });

  describe("Role-based Methods", () => {
    beforeEach(async () => {
      // Register and login a verifier user
      await authService.register({
        firstName: "Verifier",
        lastName: "User",
        email: "verifier@example.com",
        password: "password123",
        confirmPassword: "password123",
        accountType: "verifier",
      });

      await authService.login("verifier@example.com", "password123");
    });

    test("getUserRole returns correct role", () => {
      expect(authService.getUserRole()).toBe("verifier");
    });

    test("isVerifier returns true for verifier users", () => {
      expect(authService.isVerifier()).toBe(true);
    });

    test("hasPermission works correctly for verifier", () => {
      expect(authService.hasPermission("view_all_documents")).toBe(true);
      expect(authService.hasPermission("attest_document")).toBe(true);
      expect(authService.hasPermission("mint_credits")).toBe(true);
      expect(authService.hasPermission("invalid_permission")).toBe(false);
    });
  });

  describe("Individual User Permissions", () => {
    beforeEach(async () => {
      await authService.register({
        firstName: "Individual",
        lastName: "User",
        email: "individual@example.com",
        password: "password123",
        confirmPassword: "password123",
        accountType: "individual",
      });

      await authService.login("individual@example.com", "password123");
    });

    test("individual user has correct permissions", () => {
      expect(authService.hasPermission("upload_document")).toBe(true);
      expect(authService.hasPermission("view_own_documents")).toBe(true);
      expect(authService.hasPermission("view_credits")).toBe(true);
      expect(authService.hasPermission("attest_document")).toBe(false);
      expect(authService.hasPermission("mint_credits")).toBe(false);
    });

    test("isVerifier returns false for individual users", () => {
      expect(authService.isVerifier()).toBe(false);
    });
  });

  describe("Business User Permissions", () => {
    beforeEach(async () => {
      await authService.register({
        firstName: "Business",
        lastName: "User",
        email: "business@example.com",
        password: "password123",
        confirmPassword: "password123",
        accountType: "business",
      });

      await authService.login("business@example.com", "password123");
    });

    test("business user has correct permissions", () => {
      expect(authService.hasPermission("upload_document")).toBe(true);
      expect(authService.hasPermission("view_own_documents")).toBe(true);
      expect(authService.hasPermission("view_credits")).toBe(true);
      expect(authService.hasPermission("attest_document")).toBe(false);
      expect(authService.hasPermission("mint_credits")).toBe(false);
    });

    test("isVerifier returns false for business users", () => {
      expect(authService.isVerifier()).toBe(false);
    });
  });

  describe("Utility Methods", () => {
    test("getAvailableAccountTypes returns all valid types", () => {
      const types = authService.getAvailableAccountTypes();
      expect(types).toEqual(["individual", "business", "verifier"]);
    });

    test("getRolePermissions returns correct permissions for role", () => {
      const verifierPerms = authService.getRolePermissions("verifier");
      expect(verifierPerms).toContain("view_all_documents");
      expect(verifierPerms).toContain("attest_document");
      expect(verifierPerms).toContain("mint_credits");
    });

    test("getAllRolePermissions returns all role permissions", () => {
      const allPerms = authService.getAllRolePermissions();
      expect(allPerms).toHaveProperty("individual");
      expect(allPerms).toHaveProperty("business");
      expect(allPerms).toHaveProperty("verifier");
    });
  });

  describe("Unauthenticated User", () => {
    test("getUserRole returns null when not authenticated", () => {
      expect(authService.getUserRole()).toBe(null);
    });

    test("hasPermission returns false when not authenticated", () => {
      expect(authService.hasPermission("upload_document")).toBe(false);
    });

    test("isVerifier returns false when not authenticated", () => {
      expect(authService.isVerifier()).toBe(false);
    });
  });
});
