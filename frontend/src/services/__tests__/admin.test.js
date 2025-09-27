import { describe, it, expect, beforeEach, vi } from "vitest";
import adminService, { AUDIT_LOG_TYPES, ADMIN_PERMISSIONS } from "../admin.js";
import authService from "../auth.js";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock authService
vi.mock("../auth.js", () => ({
  default: {
    getCurrentUser: vi.fn(),
    getAllUsers: vi.fn(),
    users: new Map(),
    saveToStorage: vi.fn(),
  },
}));

describe("AdminService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // Reset admin service state
    adminService.auditLogs = new Map();
    adminService.verifierCredentials = new Map();
  });

  describe("Admin Access Control", () => {
    it("should correctly identify admin users", () => {
      authService.getCurrentUser.mockReturnValue({ accountType: "admin" });
      expect(adminService.isAdmin()).toBe(true);
    });

    it("should reject non-admin users", () => {
      authService.getCurrentUser.mockReturnValue({ accountType: "individual" });
      expect(adminService.isAdmin()).toBe(false);
    });

    it("should check admin permissions correctly", () => {
      authService.getCurrentUser.mockReturnValue({ accountType: "admin" });
      expect(adminService.hasAdminPermission("manage_users")).toBe(true);
      expect(adminService.hasAdminPermission("invalid_permission")).toBe(false);
    });

    it("should deny permissions to non-admin users", () => {
      authService.getCurrentUser.mockReturnValue({ accountType: "verifier" });
      expect(adminService.hasAdminPermission("manage_users")).toBe(false);
    });
  });

  describe("Audit Logging", () => {
    beforeEach(() => {
      authService.getCurrentUser.mockReturnValue({
        id: "admin1",
        email: "admin@test.com",
        accountType: "admin",
      });
    });

    it("should log audit events correctly", () => {
      const auditLog = adminService.logAuditEvent(
        AUDIT_LOG_TYPES.ROLE_CHANGE,
        { oldRole: "individual", newRole: "verifier" },
        "user123"
      );

      expect(auditLog).toMatchObject({
        type: AUDIT_LOG_TYPES.ROLE_CHANGE,
        adminId: "admin1",
        adminEmail: "admin@test.com",
        targetUserId: "user123",
        details: { oldRole: "individual", newRole: "verifier" },
      });

      expect(adminService.auditLogs.has(auditLog.id)).toBe(true);
    });

    it("should throw error when admin not authenticated", () => {
      authService.getCurrentUser.mockReturnValue(null);

      expect(() => {
        adminService.logAuditEvent(AUDIT_LOG_TYPES.ROLE_CHANGE, {});
      }).toThrow("Admin not authenticated");
    });

    it("should retrieve audit logs with filters", () => {
      // Create test logs
      const log1 = adminService.logAuditEvent(AUDIT_LOG_TYPES.ROLE_CHANGE, {});
      const log2 = adminService.logAuditEvent(AUDIT_LOG_TYPES.USER_CREATED, {});

      const allLogs = adminService.getAuditLogs();
      expect(allLogs).toHaveLength(2);

      const filteredLogs = adminService.getAuditLogs({
        type: AUDIT_LOG_TYPES.ROLE_CHANGE,
      });
      expect(filteredLogs).toHaveLength(1);
      expect(filteredLogs[0].type).toBe(AUDIT_LOG_TYPES.ROLE_CHANGE);
    });
  });

  describe("User Management", () => {
    beforeEach(() => {
      authService.getCurrentUser.mockReturnValue({
        id: "admin1",
        email: "admin@test.com",
        accountType: "admin",
      });

      authService.getAllUsers.mockReturnValue([
        { id: "user1", email: "user1@test.com", accountType: "individual" },
        { id: "user2", email: "user2@test.com", accountType: "verifier" },
      ]);
    });

    it("should get all users with admin permissions", async () => {
      const users = await adminService.getAllUsers();
      expect(users).toHaveLength(2);
      expect(users[0]).toHaveProperty("status");
      expect(users[0]).toHaveProperty("lastActivity");
    });

    it("should throw error for non-admin users", async () => {
      authService.getCurrentUser.mockReturnValue({ accountType: "individual" });

      await expect(adminService.getAllUsers()).rejects.toThrow(
        "Insufficient permissions to view users"
      );
    });

    it("should change user roles correctly", async () => {
      const mockUser = {
        id: "user1",
        email: "user1@test.com",
        accountType: "individual",
      };
      authService.getAllUsers.mockReturnValue([mockUser]);
      authService.users = new Map([["user1@test.com", mockUser]]);

      const updatedUser = await adminService.changeUserRole(
        "user1",
        "verifier",
        "Promotion"
      );

      expect(updatedUser.accountType).toBe("verifier");
      expect(adminService.verifierCredentials.has("user1")).toBe(true);
    });

    it("should prevent changing own role", async () => {
      const mockUser = {
        id: "admin1",
        email: "admin@test.com",
        accountType: "admin",
      };
      authService.getAllUsers.mockReturnValue([mockUser]);

      await expect(
        adminService.changeUserRole("admin1", "verifier", "Test")
      ).rejects.toThrow("Cannot change your own role");
    });

    it("should validate role changes", async () => {
      await expect(
        adminService.changeUserRole("user1", "invalid_role", "Test")
      ).rejects.toThrow("Invalid role: invalid_role");
    });
  });

  describe("Verifier Credentials Management", () => {
    beforeEach(() => {
      authService.getCurrentUser.mockReturnValue({
        id: "admin1",
        email: "admin@test.com",
        accountType: "admin",
      });

      authService.getAllUsers.mockReturnValue([
        {
          id: "verifier1",
          email: "verifier@test.com",
          accountType: "verifier",
        },
      ]);
    });

    it("should assign verifier credentials", async () => {
      const credentials = {
        certificationId: "CERT123",
        issuingAuthority: "Test Authority",
        validUntil: "2025-12-31",
      };

      const result = await adminService.assignVerifierCredentials(
        "verifier1",
        credentials
      );

      expect(result).toMatchObject({
        status: "active",
        certificationId: "CERT123",
        issuingAuthority: "Test Authority",
      });

      expect(adminService.verifierCredentials.has("verifier1")).toBe(true);
    });

    it("should validate credential fields", async () => {
      const incompleteCredentials = {
        certificationId: "CERT123",
        // Missing required fields
      };

      await expect(
        adminService.assignVerifierCredentials(
          "verifier1",
          incompleteCredentials
        )
      ).rejects.toThrow("All credential fields are required");
    });

    it("should validate expiration date", async () => {
      const expiredCredentials = {
        certificationId: "CERT123",
        issuingAuthority: "Test Authority",
        validUntil: "2020-01-01", // Past date
      };

      await expect(
        adminService.assignVerifierCredentials("verifier1", expiredCredentials)
      ).rejects.toThrow("Valid until date must be in the future");
    });

    it("should remove verifier credentials", async () => {
      // First assign credentials
      adminService.verifierCredentials.set("verifier1", {
        status: "active",
        certificationId: "CERT123",
      });

      const result = await adminService.removeVerifierCredentials(
        "verifier1",
        "Test removal"
      );

      expect(result.success).toBe(true);
      expect(adminService.verifierCredentials.has("verifier1")).toBe(false);
    });

    it("should validate verifier credentials", () => {
      // Active credentials
      adminService.verifierCredentials.set("verifier1", {
        status: "active",
        validUntil: "2025-12-31",
      });

      const validation = adminService.validateVerifierCredentials("verifier1");
      expect(validation.valid).toBe(true);

      // Expired credentials
      adminService.verifierCredentials.set("verifier2", {
        status: "active",
        validUntil: "2020-01-01",
      });

      const expiredValidation =
        adminService.validateVerifierCredentials("verifier2");
      expect(expiredValidation.valid).toBe(false);
      expect(expiredValidation.reason).toBe("Credentials expired");
    });
  });

  describe("Backup and Recovery", () => {
    beforeEach(() => {
      authService.getCurrentUser.mockReturnValue({
        id: "admin1",
        email: "admin@test.com",
        accountType: "admin",
      });

      authService.users = new Map([
        ["user1@test.com", { id: "user1", email: "user1@test.com" }],
      ]);
    });

    it("should create backup data", async () => {
      const backup = await adminService.createBackup();

      expect(backup).toHaveProperty("version");
      expect(backup).toHaveProperty("timestamp");
      expect(backup).toHaveProperty("users");
      expect(backup).toHaveProperty("auditLogs");
      expect(backup).toHaveProperty("verifierCredentials");
    });

    it("should restore from backup", async () => {
      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        users: [["test@test.com", { id: "test", email: "test@test.com" }]],
        auditLogs: [],
        verifierCredentials: [],
      };

      const result = await adminService.restoreFromBackup(backupData);
      expect(result.success).toBe(true);
    });

    it("should validate backup data", async () => {
      const invalidBackup = { invalid: "data" };

      await expect(
        adminService.restoreFromBackup(invalidBackup)
      ).rejects.toThrow("Invalid backup data");
    });

    it("should throw error for non-admin backup operations", async () => {
      authService.getCurrentUser.mockReturnValue({ accountType: "individual" });

      await expect(adminService.createBackup()).rejects.toThrow(
        "Insufficient permissions to create backup"
      );
    });
  });

  describe("System Statistics", () => {
    beforeEach(() => {
      authService.getCurrentUser.mockReturnValue({
        id: "admin1",
        email: "admin@test.com",
        accountType: "admin",
      });

      authService.getAllUsers.mockReturnValue([
        { id: "user1", accountType: "individual" },
        { id: "user2", accountType: "business" },
        { id: "user3", accountType: "verifier" },
      ]);

      // Add active verifier credentials
      adminService.verifierCredentials.set("user3", {
        status: "active",
        validUntil: "2025-12-31",
      });
    });

    it("should generate system statistics", () => {
      const stats = adminService.getSystemStats();

      expect(stats).toMatchObject({
        totalUsers: 3,
        roleCounts: {
          individual: 1,
          business: 1,
          verifier: 1,
        },
        activeVerifiers: 1,
        totalAuditLogs: 0,
        credentialsManaged: 1,
      });
    });

    it("should throw error for non-admin users", () => {
      authService.getCurrentUser.mockReturnValue({ accountType: "individual" });

      expect(() => adminService.getSystemStats()).toThrow(
        "Insufficient permissions to view system stats"
      );
    });
  });

  describe("Storage Management", () => {
    it("should initialize from localStorage", () => {
      const mockAuditLogs = [["log1", { id: "log1", type: "test" }]];
      const mockCredentials = [["user1", { status: "active" }]];

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockAuditLogs))
        .mockReturnValueOnce(JSON.stringify(mockCredentials));

      adminService.initializeStorage();

      expect(adminService.auditLogs.size).toBe(1);
      expect(adminService.verifierCredentials.size).toBe(1);
    });

    it("should handle storage errors gracefully", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(() => adminService.initializeStorage()).not.toThrow();
      expect(adminService.auditLogs.size).toBe(0);
    });

    it("should save to localStorage", () => {
      adminService.auditLogs.set("log1", { id: "log1" });
      adminService.verifierCredentials.set("user1", { status: "active" });

      adminService.saveToStorage();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "cblock_audit_logs",
        expect.any(String)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "cblock_verifier_credentials",
        expect.any(String)
      );
    });
  });
});
