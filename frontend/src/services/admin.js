import authService from "./auth.js";

// Admin role permissions
const ADMIN_PERMISSIONS = [
  "manage_users",
  "change_user_roles",
  "view_audit_logs",
  "manage_verifier_credentials",
  "backup_restore_data",
];

// Audit log types
const AUDIT_LOG_TYPES = {
  ROLE_CHANGE: "role_change",
  USER_CREATED: "user_created",
  USER_DELETED: "user_deleted",
  VERIFIER_ASSIGNED: "verifier_assigned",
  VERIFIER_REMOVED: "verifier_removed",
  CREDENTIALS_UPDATED: "credentials_updated",
  BACKUP_CREATED: "backup_created",
  DATA_RESTORED: "data_restored",
};

class AdminService {
  constructor() {
    this.auditLogs = new Map();
    this.verifierCredentials = new Map();
    this.initializeStorage();
  }

  // Initialize storage for admin data
  initializeStorage() {
    try {
      // Load audit logs
      const storedLogs = localStorage.getItem("cblock_audit_logs");
      if (storedLogs) {
        const logsArray = JSON.parse(storedLogs);
        this.auditLogs = new Map(logsArray);
      }

      // Load verifier credentials
      const storedCredentials = localStorage.getItem(
        "cblock_verifier_credentials"
      );
      if (storedCredentials) {
        const credentialsArray = JSON.parse(storedCredentials);
        this.verifierCredentials = new Map(credentialsArray);
      }
    } catch (error) {
      console.error("Failed to load admin data from storage:", error);
      this.auditLogs = new Map();
      this.verifierCredentials = new Map();
    }
  }

  // Save admin data to storage
  saveToStorage() {
    try {
      // Save audit logs
      const logsArray = Array.from(this.auditLogs.entries());
      localStorage.setItem("cblock_audit_logs", JSON.stringify(logsArray));

      // Save verifier credentials
      const credentialsArray = Array.from(this.verifierCredentials.entries());
      localStorage.setItem(
        "cblock_verifier_credentials",
        JSON.stringify(credentialsArray)
      );
    } catch (error) {
      console.error("Failed to save admin data to storage:", error);
    }
  }

  // Check if current user is admin
  isAdmin() {
    const currentUser = authService.getCurrentUser();
    return currentUser?.accountType === "admin";
  }

  // Check admin permission
  hasAdminPermission(permission) {
    if (!this.isAdmin()) {
      return false;
    }
    return ADMIN_PERMISSIONS.includes(permission);
  }

  // Log audit event
  logAuditEvent(type, details, targetUserId = null) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error("Admin not authenticated");
    }

    const logId =
      Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const auditLog = {
      id: logId,
      type,
      adminId: currentUser.id,
      adminEmail: currentUser.email,
      targetUserId,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: "localhost", // In production, get real IP
      userAgent: navigator.userAgent,
    };

    this.auditLogs.set(logId, auditLog);
    this.saveToStorage();
    return auditLog;
  }

  // Get all users with admin view
  async getAllUsers() {
    if (!this.hasAdminPermission("manage_users")) {
      throw new Error("Insufficient permissions to view users");
    }

    const users = authService.getAllUsers();

    // Enhance user data with admin-specific information
    const enhancedUsers = users.map((user) => ({
      ...user,
      verifierCredentials: this.verifierCredentials.get(user.id),
      lastActivity: user.lastLogin || user.createdAt,
      status: this.getUserStatus(user),
    }));

    this.logAuditEvent(AUDIT_LOG_TYPES.USER_VIEWED, {
      action: "Viewed all users",
      userCount: enhancedUsers.length,
    });

    return enhancedUsers;
  }

  // Get user status
  getUserStatus(user) {
    if (!user.isVerified) return "unverified";
    if (
      user.accountType === "verifier" &&
      !this.verifierCredentials.has(user.id)
    ) {
      return "pending_credentials";
    }
    return "active";
  }

  // Change user role
  async changeUserRole(userId, newRole, reason = "") {
    if (!this.hasAdminPermission("change_user_roles")) {
      throw new Error("Insufficient permissions to change user roles");
    }

    // Validate new role
    const validRoles = ["individual", "business", "verifier", "admin"];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}`);
    }

    // Get user by ID
    const users = authService.getAllUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      throw new Error("User not found");
    }

    const oldRole = user.accountType;

    // Prevent changing own role
    const currentUser = authService.getCurrentUser();
    if (currentUser.id === userId) {
      throw new Error("Cannot change your own role");
    }

    // Update user role in auth service
    const updatedUser = await this.updateUserInAuthService(user.email, {
      accountType: newRole,
    });

    // Handle verifier role changes
    if (newRole === "verifier" && oldRole !== "verifier") {
      // When promoting to verifier, create placeholder credentials
      this.verifierCredentials.set(userId, {
        status: "pending",
        certificationId: "",
        issuingAuthority: "",
        validUntil: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (oldRole === "verifier" && newRole !== "verifier") {
      // When demoting from verifier, remove credentials
      this.verifierCredentials.delete(userId);
    }

    this.saveToStorage();

    // Log audit event
    this.logAuditEvent(
      AUDIT_LOG_TYPES.ROLE_CHANGE,
      {
        targetUserEmail: user.email,
        oldRole,
        newRole,
        reason,
      },
      userId
    );

    return {
      ...updatedUser,
      verifierCredentials: this.verifierCredentials.get(userId),
    };
  }

  // Helper method to update user in auth service
  async updateUserInAuthService(email, updates) {
    // This is a workaround since we need to access the internal users map
    const users = authService.users;
    const user = users.get(email);
    if (!user) {
      throw new Error("User not found in auth service");
    }

    // Update user data
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    users.set(email, user);
    authService.saveToStorage();

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Assign verifier credentials
  async assignVerifierCredentials(userId, credentials) {
    if (!this.hasAdminPermission("manage_verifier_credentials")) {
      throw new Error(
        "Insufficient permissions to manage verifier credentials"
      );
    }

    const { certificationId, issuingAuthority, validUntil } = credentials;

    // Validate required fields
    if (!certificationId || !issuingAuthority || !validUntil) {
      throw new Error("All credential fields are required");
    }

    // Validate date
    const validUntilDate = new Date(validUntil);
    if (validUntilDate <= new Date()) {
      throw new Error("Valid until date must be in the future");
    }

    // Get user
    const users = authService.getAllUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.accountType !== "verifier") {
      throw new Error("User must be a verifier to assign credentials");
    }

    // Create or update credentials
    const credentialData = {
      status: "active",
      certificationId,
      issuingAuthority,
      validUntil: validUntilDate.toISOString(),
      createdAt: this.verifierCredentials.has(userId)
        ? this.verifierCredentials.get(userId).createdAt
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.verifierCredentials.set(userId, credentialData);
    this.saveToStorage();

    // Log audit event
    this.logAuditEvent(
      AUDIT_LOG_TYPES.CREDENTIALS_UPDATED,
      {
        targetUserEmail: user.email,
        certificationId,
        issuingAuthority,
        validUntil: validUntilDate.toISOString(),
      },
      userId
    );

    return credentialData;
  }

  // Remove verifier credentials
  async removeVerifierCredentials(userId, reason = "") {
    if (!this.hasAdminPermission("manage_verifier_credentials")) {
      throw new Error(
        "Insufficient permissions to manage verifier credentials"
      );
    }

    const users = authService.getAllUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      throw new Error("User not found");
    }

    const credentials = this.verifierCredentials.get(userId);
    if (!credentials) {
      throw new Error("No credentials found for this user");
    }

    this.verifierCredentials.delete(userId);
    this.saveToStorage();

    // Log audit event
    this.logAuditEvent(
      AUDIT_LOG_TYPES.VERIFIER_REMOVED,
      {
        targetUserEmail: user.email,
        reason,
        removedCredentials: credentials,
      },
      userId
    );

    return { success: true };
  }

  // Get verifier credentials
  getVerifierCredentials(userId) {
    if (!this.hasAdminPermission("manage_verifier_credentials")) {
      throw new Error("Insufficient permissions to view verifier credentials");
    }

    return this.verifierCredentials.get(userId) || null;
  }

  // Get audit logs
  getAuditLogs(filters = {}) {
    if (!this.hasAdminPermission("view_audit_logs")) {
      throw new Error("Insufficient permissions to view audit logs");
    }

    let logs = Array.from(this.auditLogs.values());

    // Apply filters
    if (filters.type) {
      logs = logs.filter((log) => log.type === filters.type);
    }

    if (filters.adminId) {
      logs = logs.filter((log) => log.adminId === filters.adminId);
    }

    if (filters.targetUserId) {
      logs = logs.filter((log) => log.targetUserId === filters.targetUserId);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      logs = logs.filter((log) => new Date(log.timestamp) >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      logs = logs.filter((log) => new Date(log.timestamp) <= endDate);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return logs;
  }

  // Create data backup
  async createBackup() {
    if (!this.hasAdminPermission("backup_restore_data")) {
      throw new Error("Insufficient permissions to create backup");
    }

    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      users: Array.from(authService.users.entries()),
      auditLogs: Array.from(this.auditLogs.entries()),
      verifierCredentials: Array.from(this.verifierCredentials.entries()),
    };

    // Log audit event
    this.logAuditEvent(AUDIT_LOG_TYPES.BACKUP_CREATED, {
      userCount: backupData.users.length,
      auditLogCount: backupData.auditLogs.length,
      credentialCount: backupData.verifierCredentials.length,
    });

    return backupData;
  }

  // Restore data from backup
  async restoreFromBackup(backupData, options = {}) {
    if (!this.hasAdminPermission("backup_restore_data")) {
      throw new Error("Insufficient permissions to restore data");
    }

    if (!backupData || !backupData.version) {
      throw new Error("Invalid backup data");
    }

    const {
      restoreUsers = true,
      restoreAuditLogs = true,
      restoreCredentials = true,
    } = options;

    try {
      if (restoreUsers && backupData.users) {
        authService.users = new Map(backupData.users);
        authService.saveToStorage();
      }

      if (restoreAuditLogs && backupData.auditLogs) {
        this.auditLogs = new Map(backupData.auditLogs);
      }

      if (restoreCredentials && backupData.verifierCredentials) {
        this.verifierCredentials = new Map(backupData.verifierCredentials);
      }

      this.saveToStorage();

      // Log audit event
      this.logAuditEvent(AUDIT_LOG_TYPES.DATA_RESTORED, {
        backupTimestamp: backupData.timestamp,
        restoredUsers: restoreUsers,
        restoredAuditLogs: restoreAuditLogs,
        restoredCredentials: restoreCredentials,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to restore backup:", error);
      throw new Error("Failed to restore data from backup");
    }
  }

  // Get system statistics
  getSystemStats() {
    if (!this.hasAdminPermission("manage_users")) {
      throw new Error("Insufficient permissions to view system stats");
    }

    const users = authService.getAllUsers();
    const roleCounts = users.reduce((acc, user) => {
      acc[user.accountType] = (acc[user.accountType] || 0) + 1;
      return acc;
    }, {});

    const activeVerifiers = users.filter(
      (user) =>
        user.accountType === "verifier" &&
        this.verifierCredentials.has(user.id) &&
        this.verifierCredentials.get(user.id).status === "active"
    ).length;

    return {
      totalUsers: users.length,
      roleCounts,
      activeVerifiers,
      totalAuditLogs: this.auditLogs.size,
      credentialsManaged: this.verifierCredentials.size,
    };
  }

  // Validate verifier credentials
  validateVerifierCredentials(userId) {
    const credentials = this.verifierCredentials.get(userId);
    if (!credentials) {
      return { valid: false, reason: "No credentials found" };
    }

    if (credentials.status !== "active") {
      return { valid: false, reason: "Credentials not active" };
    }

    const validUntil = new Date(credentials.validUntil);
    if (validUntil <= new Date()) {
      return { valid: false, reason: "Credentials expired" };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const adminService = new AdminService();
export default adminService;
export { AUDIT_LOG_TYPES, ADMIN_PERMISSIONS };
