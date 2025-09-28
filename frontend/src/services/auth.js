import blockchainService from "./blockchain.js";

// Role permission constants
const ROLE_PERMISSIONS = {
  business: ["upload_document", "view_own_documents", "view_credits"],
  verifier: [
    "view_all_documents",
    "attest_document",
    "mint_credits",
    "view_verifier_dashboard",
  ],
  admin: [
    "manage_users",
    "change_user_roles",
    "view_audit_logs",
    "manage_verifier_credentials",
    "backup_restore_data",
    "view_admin_dashboard",
    // Admin also has all other permissions
    "upload_document",
    "view_own_documents",
    "view_credits",
    "view_all_documents",
    "attest_document",
    "mint_credits",
    "view_verifier_dashboard",
  ],
};

const VALID_ACCOUNT_TYPES = ["business", "verifier", "admin"];

class AuthService {
  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.users = new Map(); // In-memory storage for demo
    this.initializeStorage();
  }

  // Initialize storage - load users from localStorage
  initializeStorage() {
    try {
      const stored = localStorage.getItem("cblock_users");
      if (stored) {
        const usersArray = JSON.parse(stored);
        this.users = new Map(usersArray);
      }
    } catch (error) {
      console.error("Failed to load users from storage:", error);
      this.users = new Map();
    }
  }

  // Save users to localStorage
  saveToStorage() {
    try {
      const usersArray = Array.from(this.users.entries());
      localStorage.setItem("cblock_users", JSON.stringify(usersArray));
    } catch (error) {
      console.error("Failed to save users to storage:", error);
    }
  }

  // Hash password (simple demo implementation - use proper hashing in production)
  hashPassword(password) {
    // Simple hash for demo - in production use bcrypt or similar
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  // Validate email format
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  validatePassword(password) {
    if (password.length < 6) {
      return {
        valid: false,
        message: "Password must be at least 6 characters long",
      };
    }
    return { valid: true };
  }

  // Register new user
  async register(userData) {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      organization,
      accountType,
      walletAddress,
    } = userData;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      throw new Error("Please fill in all required fields");
    }

    if (!this.validateEmail(email)) {
      throw new Error("Please enter a valid email address");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Validate account type
    const accountTypeValidation = this.validateAccountType(accountType);
    if (!accountTypeValidation.valid) {
      throw new Error(accountTypeValidation.message);
    }

    // Check if user already exists
    if (this.users.has(email)) {
      throw new Error("An account with this email already exists");
    }

    // Create user object
    const user = {
      id: Date.now().toString(),
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email,
      organization: organization || "",
      accountType: accountTypeValidation.accountType,
      walletAddress: walletAddress || "",
      passwordHash: this.hashPassword(password),
      createdAt: new Date().toISOString(),
      isVerified: false,
      profile: {
        avatar: null,
        bio: "",
        location: "",
        website: "",
      },
    };

    // Save user
    this.users.set(email, user);
    this.saveToStorage();

    // Return user data (without password hash)
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Login user
  async login(email, password) {
    if (!email || !password) {
      throw new Error("Please enter both email and password");
    }

    if (!this.validateEmail(email)) {
      throw new Error("Please enter a valid email address");
    }

    // Find user
    const user = this.users.get(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check password
    const passwordHash = this.hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      throw new Error("Invalid email or password");
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    this.users.set(email, user);
    this.saveToStorage();

    // Set current user
    this.currentUser = user;
    this.isAuthenticated = true;

    // Return user data (without password hash)
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Logout user
  logout() {
    this.currentUser = null;
    this.isAuthenticated = false;
    localStorage.removeItem("cblock_user_session");
  }

  // Get current user
  getCurrentUser() {
    if (!this.currentUser) {
      return null;
    }
    const { passwordHash, ...userWithoutPassword } = this.currentUser;
    return userWithoutPassword;
  }

  // Check if user is authenticated
  isUserAuthenticated() {
    return this.isAuthenticated && this.currentUser !== null;
  }

  // Get current user's role
  getUserRole() {
    if (!this.currentUser) {
      return null;
    }
    return this.currentUser.accountType || "business";
  }

  // Check if user has specific permission
  hasPermission(action) {
    const role = this.getUserRole();
    if (!role) {
      return false;
    }
    return ROLE_PERMISSIONS[role]?.includes(action) || false;
  }

  // Check if current user is a verifier
  isVerifier() {
    return this.getUserRole() === "verifier";
  }

  // Check if current user is an admin
  isAdmin() {
    return this.getUserRole() === "admin";
  }

  // Validate account type
  validateAccountType(accountType) {
    if (!accountType) {
      return { valid: true, accountType: "business" }; // Default to business
    }

    if (!VALID_ACCOUNT_TYPES.includes(accountType)) {
      return {
        valid: false,
        message: `Invalid account type. Must be one of: ${VALID_ACCOUNT_TYPES.join(
          ", "
        )}`,
      };
    }

    return { valid: true, accountType };
  }

  // Get available account types
  getAvailableAccountTypes() {
    return [...VALID_ACCOUNT_TYPES];
  }

  // Get permissions for a specific role
  getRolePermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
  }

  // Get all role permissions
  getAllRolePermissions() {
    return { ...ROLE_PERMISSIONS };
  }

  // Update user profile
  async updateProfile(updates) {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error("User not authenticated");
    }

    const user = this.users.get(this.currentUser.email);
    if (!user) {
      throw new Error("User not found");
    }

    // Validate account type if being updated
    if (updates.accountType !== undefined) {
      const accountTypeValidation = this.validateAccountType(
        updates.accountType
      );
      if (!accountTypeValidation.valid) {
        throw new Error(accountTypeValidation.message);
      }
      user.accountType = accountTypeValidation.accountType;
    }

    // Update allowed fields
    const allowedUpdates = [
      "firstName",
      "lastName",
      "organization",
      "walletAddress",
    ];

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    });

    // Update profile fields
    if (updates.profile) {
      user.profile = { ...user.profile, ...updates.profile };
    }

    user.updatedAt = new Date().toISOString();

    // Update full name if firstName or lastName was changed
    if (updates.firstName || updates.lastName) {
      user.name = `${user.firstName} ${user.lastName}`;
    }

    // Save changes
    this.users.set(user.email, user);
    this.saveToStorage();
    this.currentUser = user;

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error("User not authenticated");
    }

    const user = this.users.get(this.currentUser.email);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const currentPasswordHash = this.hashPassword(currentPassword);
    if (user.passwordHash !== currentPasswordHash) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Update password
    user.passwordHash = this.hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();

    // Save changes
    this.users.set(user.email, user);
    this.saveToStorage();

    return { success: true };
  }

  // Connect wallet to user account
  async connectWallet() {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error("User not authenticated");
    }

    try {
      const walletInfo = await blockchainService.connectWallet();

      // Update user's wallet address
      await this.updateProfile({
        walletAddress: walletInfo.address,
      });

      return walletInfo;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }

  // Get user stats (tokens, transactions, etc.)
  async getUserStats(userAddress) {
    if (!userAddress && this.currentUser?.walletAddress) {
      userAddress = this.currentUser.walletAddress;
    }

    if (!userAddress) {
      return {
        totalTokens: 0,
        totalValue: 0,
        retiredTokens: 0,
        certificatesCount: 0,
      };
    }

    try {
      // Get user's tokens from blockchain
      const tokens = await blockchainService.getUserTokens(userAddress);
      const certificates = await blockchainService.getRetirementCertificates(
        userAddress
      );

      const totalTokens = tokens.reduce((sum, token) => sum + token.balance, 0);
      const totalValue = totalTokens * 35; // Mock price calculation
      const retiredTokens = Math.floor(totalTokens * 0.1); // Mock retired calculation

      return {
        totalTokens,
        totalValue,
        retiredTokens,
        certificatesCount: certificates.length,
        tokens,
        certificates,
      };
    } catch (error) {
      console.error("Error getting user stats:", error);
      return {
        totalTokens: 0,
        totalValue: 0,
        retiredTokens: 0,
        certificatesCount: 0,
        tokens: [],
        certificates: [],
      };
    }
  }

  // Reset password (simplified - in production would send email)
  async resetPassword(email) {
    if (!this.validateEmail(email)) {
      throw new Error("Please enter a valid email address");
    }

    const user = this.users.get(email);
    if (!user) {
      throw new Error("No account found with this email address");
    }

    // In production, you would send a reset email here
    // For demo, we'll generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    user.passwordHash = this.hashPassword(tempPassword);
    user.updatedAt = new Date().toISOString();

    this.users.set(email, user);
    this.saveToStorage();

    // In production, don't return the password
    return {
      success: true,
      message: "Password reset successful",
      tempPassword: tempPassword, // Only for demo
    };
  }

  // Get all users (admin only - simplified for demo)
  getAllUsers() {
    const usersArray = Array.from(this.users.values()).map((user) => {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    return usersArray;
  }

  // Delete account
  async deleteAccount(password) {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error("User not authenticated");
    }

    const user = this.users.get(this.currentUser.email);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify password
    const passwordHash = this.hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      throw new Error("Password is incorrect");
    }

    // Delete user
    this.users.delete(this.currentUser.email);
    this.saveToStorage();

    // Logout
    this.logout();

    return { success: true };
  }

  // Check if user has connected wallet
  hasConnectedWallet() {
    return (
      this.currentUser?.walletAddress && this.currentUser.walletAddress !== ""
    );
  }

  // Initialize session from storage
  initializeSession() {
    try {
      const session = localStorage.getItem("cblock_user_session");
      if (session) {
        const sessionData = JSON.parse(session);
        const user = this.users.get(sessionData.email);
        if (user) {
          this.currentUser = user;
          this.isAuthenticated = true;
          return this.getCurrentUser();
        } else {
          // If user not found in storage but session exists, create from session data
          const restoredUser = {
            id: sessionData.id,
            name:
              sessionData.name ||
              `${sessionData.firstName} ${sessionData.lastName}`,
            firstName: sessionData.firstName,
            lastName: sessionData.lastName,
            email: sessionData.email,
            organization: sessionData.organization || "",
            accountType: sessionData.accountType || "business",
            walletAddress: sessionData.walletAddress || "",
            passwordHash: "", // Cannot restore password hash
            createdAt: new Date().toISOString(),
            isVerified: true,
            profile: { avatar: null, bio: "", location: "", website: "" },
          };

          this.users.set(sessionData.email, restoredUser);
          this.currentUser = restoredUser;
          this.isAuthenticated = true;
          this.saveToStorage();

          return this.getCurrentUser();
        }
      }
    } catch (error) {
      console.error("Failed to initialize session:", error);
    }
    return null;
  }

  // Save session to storage
  saveSession() {
    if (this.currentUser) {
      const sessionData = {
        email: this.currentUser.email,
        name: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
        firstName: this.currentUser.firstName,
        lastName: this.currentUser.lastName,
        organization: this.currentUser.organization,
        accountType: this.currentUser.accountType,
        walletAddress: this.currentUser.walletAddress,
        id: this.currentUser.id,
        timestamp: Date.now(),
      };
      localStorage.setItem("cblock_user_session", JSON.stringify(sessionData));
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
