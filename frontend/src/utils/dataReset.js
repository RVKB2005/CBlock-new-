/**
 * Data Reset Utility
 * Provides comprehensive data reset functionality for the CBlock application
 */

import { toast } from "react-hot-toast";

/**
 * Reset all application data to zero/empty state
 * @param {Object} options - Reset options
 * @returns {Promise<boolean>} Success status
 */
export async function resetAllApplicationData(options = {}) {
  const {
    skipConfirmation = false,
    showToasts = true,
    includeBlockchainData = false,
  } = options;

  try {
    // Confirmation dialogs (unless skipped)
    if (!skipConfirmation) {
      const confirmed = window.confirm(
        "⚠️ WARNING: This will permanently delete ALL application data including:\n\n" +
          "• All uploaded documents\n" +
          "• All credit allocations\n" +
          "• All transaction history\n" +
          "• All attestations\n" +
          "• All user dashboard data\n" +
          "• All verifier data\n\n" +
          "This action cannot be undone. Are you sure you want to continue?"
      );

      if (!confirmed) return false;

      const confirmText = window.prompt(
        'Type "RESET ALL" to confirm complete data deletion:'
      );

      if (confirmText !== "RESET ALL") {
        if (showToasts) {
          toast.error("Reset cancelled - confirmation text did not match");
        }
        return false;
      }
    }

    console.log("🗑️ STARTING COMPLETE APPLICATION DATA RESET...");

    // Import services dynamically
    const [{ default: creditAllocationService }, { default: documentService }] =
      await Promise.all([
        import("../services/creditAllocation.js"),
        import("../services/document.js"),
      ]);

    // Reset all service data
    const results = {
      allocations: creditAllocationService.resetAllData(),
      documents: documentService.resetAllData(),
    };

    console.log("Service reset results:", results);

    // Clear ALL localStorage items related to the application
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      allKeys.push(localStorage.key(i));
    }

    const appRelatedKeys = allKeys.filter(
      (key) =>
        key &&
        (key.startsWith("cblock_") ||
          key.startsWith("carbon_") ||
          key.includes("credit") ||
          key.includes("document") ||
          key.includes("allocation") ||
          key.includes("transaction") ||
          key.includes("attestation") ||
          key.includes("verifier") ||
          key.includes("user") ||
          key.includes("auth") ||
          key.includes("wallet") ||
          key.includes("blockchain") ||
          key.includes("ipfs") ||
          key.includes("mint"))
    );

    console.log(
      `Found ${appRelatedKeys.length} app-related localStorage keys to remove:`,
      appRelatedKeys
    );

    // Remove all app-related localStorage items
    appRelatedKeys.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`✅ Removed localStorage key: ${key}`);
    });

    // Clear sessionStorage as well
    const sessionKeys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      sessionKeys.push(sessionStorage.key(i));
    }

    const appRelatedSessionKeys = sessionKeys.filter(
      (key) =>
        key &&
        (key.startsWith("cblock_") ||
          key.startsWith("carbon_") ||
          key.includes("credit") ||
          key.includes("document") ||
          key.includes("allocation"))
    );

    appRelatedSessionKeys.forEach((key) => {
      sessionStorage.removeItem(key);
      console.log(`✅ Removed sessionStorage key: ${key}`);
    });

    // Clear any cached data in memory (if services have cache)
    try {
      // Force garbage collection if available (development only)
      if (window.gc && typeof window.gc === "function") {
        window.gc();
      }
    } catch (e) {
      // Ignore errors
    }

    console.log("✅ COMPLETE APPLICATION DATA RESET FINISHED");

    if (showToasts) {
      toast.success("🗑️ ALL APPLICATION DATA HAS BEEN RESET TO ZERO", {
        duration: 10000,
        style: {
          background: "#ef4444",
          color: "white",
          fontWeight: "bold",
          fontSize: "16px",
        },
      });
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to reset application data:", error);

    if (showToasts) {
      toast.error(`Failed to reset data: ${error.message}`, {
        duration: 8000,
      });
    }

    return false;
  }
}

/**
 * Reset only user-specific data (documents and allocations for current user)
 * @param {string} userAddress - User wallet address
 * @returns {Promise<boolean>} Success status
 */
export async function resetUserData(userAddress) {
  try {
    console.log(`🗑️ Resetting data for user: ${userAddress}`);

    // Import services
    const [{ default: creditAllocationService }, { default: documentService }] =
      await Promise.all([
        import("../services/creditAllocation.js"),
        import("../services/document.js"),
      ]);

    // Get user allocations and documents
    const userAllocations = await creditAllocationService.getUserAllocations(
      userAddress
    );
    const userDocuments = await documentService.getUserDocuments();

    // Remove user allocations
    userAllocations.forEach((allocation) => {
      creditAllocationService.allocations.delete(allocation.id);
    });

    // Remove user documents
    userDocuments.forEach((document) => {
      documentService.documents.delete(document.id);
    });

    // Save updated data
    creditAllocationService.saveToStorage();
    documentService.saveToStorage();

    console.log(
      `✅ Reset ${userAllocations.length} allocations and ${userDocuments.length} documents for user`
    );

    toast.success(
      `Reset ${userAllocations.length} allocations and ${userDocuments.length} documents`
    );

    return true;
  } catch (error) {
    console.error("❌ Failed to reset user data:", error);
    toast.error(`Failed to reset user data: ${error.message}`);
    return false;
  }
}

/**
 * Get data reset statistics
 * @returns {Object} Statistics about what would be reset
 */
export async function getResetStatistics() {
  try {
    // Import services
    const [{ default: creditAllocationService }, { default: documentService }] =
      await Promise.all([
        import("../services/creditAllocation.js"),
        import("../services/document.js"),
      ]);

    // Count localStorage items
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      allKeys.push(localStorage.key(i));
    }

    const appRelatedKeys = allKeys.filter(
      (key) =>
        key &&
        (key.startsWith("cblock_") ||
          key.includes("credit") ||
          key.includes("document") ||
          key.includes("allocation"))
    );

    return {
      allocations: creditAllocationService.allocations.size,
      documents: documentService.documents.size,
      localStorageKeys: appRelatedKeys.length,
      localStorageKeysList: appRelatedKeys,
      totalDataSize:
        JSON.stringify(
          Array.from(creditAllocationService.allocations.entries())
        ).length +
        JSON.stringify(Array.from(documentService.documents.entries())).length,
    };
  } catch (error) {
    console.error("❌ Failed to get reset statistics:", error);
    return {
      allocations: 0,
      documents: 0,
      localStorageKeys: 0,
      localStorageKeysList: [],
      totalDataSize: 0,
      error: error.message,
    };
  }
}

export default {
  resetAllApplicationData,
  resetUserData,
  getResetStatistics,
};
