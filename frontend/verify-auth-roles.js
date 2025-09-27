// Simple verification script for auth role management
// Run this with: node verify-auth-roles.js

// Mock localStorage for Node.js environment
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  },
};

// Mock console for cleaner output
const originalLog = console.log;
console.log = (...args) => {
  if (!args[0]?.includes("Failed to")) {
    originalLog(...args);
  }
};

// Import the auth service (we'll need to adjust the import)
import("./src/services/auth.js")
  .then(async ({ default: authService }) => {
    console.log("🧪 Testing Auth Service Role Management...\n");

    try {
      // Test 1: Validate account types
      console.log("✅ Test 1: Account Type Validation");
      const validResult = authService.validateAccountType("verifier");
      console.log(
        `   Valid type 'verifier': ${validResult.valid ? "PASS" : "FAIL"}`
      );

      const invalidResult = authService.validateAccountType("invalid");
      console.log(
        `   Invalid type 'invalid': ${!invalidResult.valid ? "PASS" : "FAIL"}`
      );

      const defaultResult = authService.validateAccountType();
      console.log(
        `   Default type: ${
          defaultResult.accountType === "individual" ? "PASS" : "FAIL"
        }\n`
      );

      // Test 2: Register users with different roles
      console.log("✅ Test 2: User Registration with Roles");

      const verifierUser = await authService.register({
        firstName: "Test",
        lastName: "Verifier",
        email: "verifier@test.com",
        password: "password123",
        confirmPassword: "password123",
        accountType: "verifier",
      });
      console.log(
        `   Verifier registration: ${
          verifierUser.accountType === "verifier" ? "PASS" : "FAIL"
        }`
      );

      const individualUser = await authService.register({
        firstName: "Test",
        lastName: "Individual",
        email: "individual@test.com",
        password: "password123",
        confirmPassword: "password123",
      });
      console.log(
        `   Individual registration (default): ${
          individualUser.accountType === "individual" ? "PASS" : "FAIL"
        }\n`
      );

      // Test 3: Role-based permissions
      console.log("✅ Test 3: Role-based Permissions");

      // Login as verifier
      await authService.login("verifier@test.com", "password123");
      console.log(
        `   Verifier login: ${authService.isVerifier() ? "PASS" : "FAIL"}`
      );
      console.log(
        `   Verifier can attest: ${
          authService.hasPermission("attest_document") ? "PASS" : "FAIL"
        }`
      );
      console.log(
        `   Verifier can mint credits: ${
          authService.hasPermission("mint_credits") ? "PASS" : "FAIL"
        }`
      );

      // Login as individual
      await authService.login("individual@test.com", "password123");
      console.log(
        `   Individual login: ${!authService.isVerifier() ? "PASS" : "FAIL"}`
      );
      console.log(
        `   Individual can upload: ${
          authService.hasPermission("upload_document") ? "PASS" : "FAIL"
        }`
      );
      console.log(
        `   Individual cannot attest: ${
          !authService.hasPermission("attest_document") ? "PASS" : "FAIL"
        }\n`
      );

      // Test 4: Utility methods
      console.log("✅ Test 4: Utility Methods");
      const availableTypes = authService.getAvailableAccountTypes();
      console.log(
        `   Available types count: ${
          availableTypes.length === 3 ? "PASS" : "FAIL"
        }`
      );

      const verifierPerms = authService.getRolePermissions("verifier");
      console.log(
        `   Verifier permissions count: ${
          verifierPerms.length === 4 ? "PASS" : "FAIL"
        }`
      );

      console.log("\n🎉 All role management tests completed!");
    } catch (error) {
      console.error("❌ Test failed:", error.message);
    }
  })
  .catch((error) => {
    console.error("❌ Failed to import auth service:", error.message);
  });
