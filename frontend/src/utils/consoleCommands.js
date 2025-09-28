/**
 * Console Commands for CBlock Application
 * Provides easy-to-use console commands for development and testing
 */

import { resetAllApplicationData, getResetStatistics } from "./dataReset.js";

/**
 * Initialize console commands
 * Call this in your main app to make commands available in browser console
 */
export function initializeConsoleCommands() {
  // Make reset functions available globally
  window.CBlock = {
    // Reset all data
    resetAll: async () => {
      console.log("🗑️ CBlock.resetAll() - Resetting all application data...");
      const success = await resetAllApplicationData({
        skipConfirmation: false,
        showToasts: true,
      });
      return success;
    },

    // Reset all data without confirmation (dangerous!)
    resetAllForce: async () => {
      console.log(
        "🗑️ CBlock.resetAllForce() - Force resetting all data WITHOUT confirmation..."
      );
      const success = await resetAllApplicationData({
        skipConfirmation: true,
        showToasts: true,
      });
      return success;
    },

    // Get statistics about what would be reset
    getStats: async () => {
      console.log("📊 CBlock.getStats() - Getting reset statistics...");
      const stats = await getResetStatistics();
      console.table(stats);
      return stats;
    },

    // Clear localStorage only
    clearStorage: () => {
      console.log("🗑️ CBlock.clearStorage() - Clearing localStorage...");
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }

      const appKeys = keys.filter(
        (key) =>
          key &&
          (key.startsWith("cblock_") ||
            key.includes("credit") ||
            key.includes("document") ||
            key.includes("allocation"))
      );

      appKeys.forEach((key) => localStorage.removeItem(key));
      console.log(`✅ Cleared ${appKeys.length} localStorage keys:`, appKeys);
      return appKeys;
    },

    // Show help
    help: () => {
      console.log(`
🔧 CBlock Console Commands:

• CBlock.resetAll()      - Reset all data with confirmation
• CBlock.resetAllForce() - Reset all data WITHOUT confirmation (dangerous!)
• CBlock.getStats()      - Show statistics about stored data
• CBlock.clearStorage()  - Clear only localStorage items
• CBlock.help()          - Show this help message

Example usage:
  CBlock.getStats()      // See what data exists
  CBlock.resetAll()      // Reset everything with confirmation
      `);
    },
  };

  // Show welcome message
  console.log(`
🚀 CBlock Console Commands Loaded!

Type CBlock.help() to see available commands.
Type CBlock.getStats() to see current data statistics.
Type CBlock.resetAll() to reset all application data.
  `);
}

export default {
  initializeConsoleCommands,
};
