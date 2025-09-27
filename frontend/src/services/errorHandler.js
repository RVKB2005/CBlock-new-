import { toast } from "react-hot-toast";
import authService from "./auth.js";

/**
 * Centralized Error Handling Service
 * Provides role-specific error messages and user guidance
 */
class ErrorHandlerService {
  constructor() {
    this.errorHistory = [];
    this.retryAttempts = new Map();
    this.maxRetryAttempts = 3;
    this.retryDelay = 1000; // Base delay in milliseconds
  }

  /**
   * Handle and display errors with role-specific messaging
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Error context information
   * @param {Object} options - Display options
   */
  handleError(error, context = {}, options = {}) {
    try {
      const {
        showToast = true,
        logError = true,
        showRetry = false,
        retryAction = null,
        component = "unknown",
        operation = "unknown",
      } = options;

      // Normalize error
      const normalizedError = this.normalizeError(error);

      // Get user role for context
      const currentUser = authService.getCurrentUser();
      const userRole = currentUser?.accountType || "guest";

      // Create error context
      const errorContext = {
        ...context,
        userRole,
        component,
        operation,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      // Log error if requested
      if (logError) {
        this.logError(normalizedError, errorContext);
      }

      // Get role-specific error message
      const userMessage = this.getRoleSpecificMessage(
        normalizedError,
        userRole,
        errorContext
      );

      // Show toast notification
      if (showToast) {
        this.showErrorToast(userMessage, {
          showRetry,
          retryAction,
          error: normalizedError,
          context: errorContext,
        });
      }

      return {
        error: normalizedError,
        message: userMessage,
        context: errorContext,
      };
    } catch (handlingError) {
      console.error("Error in error handler:", handlingError);
      // Fallback error display
      toast.error("An unexpected error occurred. Please try again.");
      return {
        error: error,
        message: "An unexpected error occurred",
        context: {},
      };
    }
  }

  /**
   * Normalize error to consistent format
   * @param {Error|string} error - Error to normalize
   * @returns {Object} Normalized error
   */
  normalizeError(error) {
    if (typeof error === "string") {
      return {
        message: error,
        code: "GENERIC_ERROR",
        type: "user_error",
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        code: error.code || "UNKNOWN_ERROR",
        type: this.categorizeError(error),
        stack: error.stack,
        name: error.name,
      };
    }

    if (error && typeof error === "object") {
      return {
        message: error.message || "Unknown error",
        code: error.code || "UNKNOWN_ERROR",
        type: error.type || "unknown",
        ...error,
      };
    }

    return {
      message: "An unknown error occurred",
      code: "UNKNOWN_ERROR",
      type: "unknown",
    };
  }

  /**
   * Categorize error type
   * @param {Error} error - Error to categorize
   * @returns {string} Error category
   */
  categorizeError(error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection")
    ) {
      return "network_error";
    }

    // Authentication errors
    if (
      message.includes("authentication") ||
      message.includes("unauthorized") ||
      message.includes("login")
    ) {
      return "auth_error";
    }

    // Permission errors
    if (
      message.includes("permission") ||
      message.includes("access denied") ||
      message.includes("forbidden")
    ) {
      return "permission_error";
    }

    // Validation errors
    if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("required")
    ) {
      return "validation_error";
    }

    // Blockchain errors
    if (
      message.includes("transaction") ||
      message.includes("gas") ||
      message.includes("contract") ||
      message.includes("wallet")
    ) {
      return "blockchain_error";
    }

    // File upload errors
    if (
      message.includes("file") ||
      message.includes("upload") ||
      message.includes("ipfs")
    ) {
      return "upload_error";
    }

    return "user_error";
  }

  /**
   * Get role-specific error message and guidance
   * @param {Object} error - Normalized error
   * @param {string} userRole - User role
   * @param {Object} context - Error context
   * @returns {Object} User message with guidance
   */
  getRoleSpecificMessage(error, userRole, context) {
    const baseMessage = this.getBaseErrorMessage(error);
    const guidance = this.getRoleSpecificGuidance(error, userRole, context);

    return {
      title: this.getErrorTitle(error),
      message: baseMessage,
      guidance: guidance,
      severity: this.getErrorSeverity(error),
      actionable: this.isErrorActionable(error, userRole),
    };
  }

  /**
   * Get base error message
   * @param {Object} error - Normalized error
   * @returns {string} Base error message
   */
  getBaseErrorMessage(error) {
    const errorMessages = {
      // Authentication errors
      USER_NOT_AUTHENTICATED: "Please log in to continue",
      SESSION_EXPIRED: "Your session has expired. Please log in again",
      INVALID_CREDENTIALS: "Invalid email or password",

      // Permission errors
      INSUFFICIENT_PERMISSIONS:
        "You do not have permission to perform this action",
      VERIFIER_REQUIRED: "This action requires verifier privileges",
      ACCESS_DENIED: "Access denied",

      // File upload errors
      FILE_TOO_LARGE: "File is too large. Maximum size is 10MB",
      INVALID_FILE_TYPE:
        "Invalid file type. Please upload PDF, DOC, DOCX, TXT, JPG, or PNG files",
      UPLOAD_FAILED: "File upload failed. Please try again",
      IPFS_ERROR: "Failed to store file on IPFS network",

      // Document errors
      DOCUMENT_NOT_FOUND: "Document not found",
      DOCUMENT_ALREADY_ATTESTED: "Document has already been attested",
      DOCUMENT_ALREADY_MINTED: "Document has already been minted",
      INVALID_DOCUMENT_STATUS:
        "Document is not in the correct status for this operation",

      // Blockchain errors
      WALLET_NOT_CONNECTED: "Please connect your wallet to continue",
      TRANSACTION_FAILED: "Transaction failed. Please try again",
      INSUFFICIENT_FUNDS: "Insufficient funds to complete the transaction",
      USER_REJECTED_TRANSACTION: "Transaction was rejected",
      NETWORK_ERROR:
        "Network connection error. Please check your internet connection",
      CONTRACT_NOT_DEPLOYED:
        "Smart contract not deployed. Please check configuration",

      // Validation errors
      VALIDATION_ERROR: "Please check your input and try again",
      REQUIRED_FIELD_MISSING: "Please fill in all required fields",
      INVALID_INPUT: "Invalid input provided",

      // Generic errors
      GENERIC_ERROR: "An error occurred. Please try again",
      UNKNOWN_ERROR: "An unexpected error occurred",
    };

    return (
      errorMessages[error.code] ||
      error.message ||
      "An unexpected error occurred"
    );
  }

  /**
   * Get role-specific guidance
   * @param {Object} error - Normalized error
   * @param {string} userRole - User role
   * @param {Object} context - Error context
   * @returns {string} Role-specific guidance
   */
  getRoleSpecificGuidance(error, userRole, context) {
    const { operation, component } = context;

    // Role-specific guidance based on error type and user role
    const guidanceMap = {
      individual: {
        upload_error:
          "As an individual user, you can upload documents for verification. Make sure your file meets the requirements and try again.",
        permission_error:
          "Individual users can upload documents but cannot perform verifications or minting. Contact a verifier if you need assistance.",
        auth_error:
          "Please ensure you are logged in with your individual account.",
        blockchain_error:
          "Connect your wallet to interact with the blockchain. Individual users can view their documents and credit balance.",
      },
      business: {
        upload_error:
          "As a business user, you can upload project documents for verification. Ensure your documentation is complete and meets the requirements.",
        permission_error:
          "Business users can upload documents but cannot perform verifications or minting. Work with authorized verifiers for document processing.",
        auth_error:
          "Please ensure you are logged in with your business account.",
        blockchain_error:
          "Connect your business wallet to track your documents and credits.",
      },
      verifier: {
        upload_error:
          "As a verifier, you typically review documents rather than upload them. Use the Verifier Dashboard to manage document reviews.",
        permission_error:
          "Verifiers have access to document review, attestation, and minting functions. Make sure you are using the correct interface.",
        auth_error:
          "Please ensure you are logged in with your verifier account.",
        blockchain_error:
          "Verifiers need wallet access for attestations and minting. Ensure your wallet is connected and you have sufficient gas fees.",
        attestation_error:
          "Check that the document is in pending status and all required fields are completed before attesting.",
        minting_error:
          "Ensure the document has been properly attested before attempting to mint credits.",
      },
      guest: {
        auth_error:
          "Please create an account or log in to access this feature.",
        permission_error:
          "You need to be logged in to perform this action. Please create an account or sign in.",
      },
    };

    const roleGuidance = guidanceMap[userRole] || guidanceMap.guest;

    // Get specific guidance based on error type
    if (error.type && roleGuidance[error.type]) {
      return roleGuidance[error.type];
    }

    // Get guidance based on operation
    if (operation === "document_upload" && roleGuidance.upload_error) {
      return roleGuidance.upload_error;
    }

    if (
      operation === "document_attestation" &&
      roleGuidance.attestation_error
    ) {
      return roleGuidance.attestation_error;
    }

    if (operation === "credit_minting" && roleGuidance.minting_error) {
      return roleGuidance.minting_error;
    }

    // Default guidance
    return this.getDefaultGuidance(error, userRole);
  }

  /**
   * Get default guidance for error
   * @param {Object} error - Normalized error
   * @param {string} userRole - User role
   * @returns {string} Default guidance
   */
  getDefaultGuidance(error, userRole) {
    if (error.type === "network_error") {
      return "Check your internet connection and try again. If the problem persists, the service may be temporarily unavailable.";
    }

    if (error.type === "validation_error") {
      return "Please review the form fields and ensure all required information is provided correctly.";
    }

    if (userRole === "guest") {
      return "Please create an account or log in to access this feature.";
    }

    return "If this problem continues, please contact support for assistance.";
  }

  /**
   * Get error title
   * @param {Object} error - Normalized error
   * @returns {string} Error title
   */
  getErrorTitle(error) {
    const titles = {
      auth_error: "Authentication Required",
      permission_error: "Access Denied",
      upload_error: "Upload Failed",
      blockchain_error: "Blockchain Error",
      network_error: "Connection Error",
      validation_error: "Invalid Input",
      user_error: "Action Failed",
    };

    return titles[error.type] || "Error";
  }

  /**
   * Get error severity
   * @param {Object} error - Normalized error
   * @returns {string} Error severity
   */
  getErrorSeverity(error) {
    const severityMap = {
      auth_error: "high",
      permission_error: "medium",
      blockchain_error: "high",
      network_error: "medium",
      validation_error: "low",
      upload_error: "medium",
    };

    return severityMap[error.type] || "medium";
  }

  /**
   * Check if error is actionable by user
   * @param {Object} error - Normalized error
   * @param {string} userRole - User role
   * @returns {boolean} Whether error is actionable
   */
  isErrorActionable(error, userRole) {
    // Validation errors are always actionable
    if (error.type === "validation_error") {
      return true;
    }

    // Auth errors are actionable (user can log in)
    if (error.type === "auth_error") {
      return true;
    }

    // Permission errors may be actionable depending on role
    if (error.type === "permission_error") {
      return userRole === "guest"; // Guests can log in to get permissions
    }

    // Upload errors are usually actionable
    if (error.type === "upload_error") {
      return true;
    }

    // Network errors are not directly actionable by user
    if (error.type === "network_error") {
      return false;
    }

    return true;
  }

  /**
   * Show error toast with enhanced options
   * @param {Object} userMessage - User message object
   * @param {Object} options - Toast options
   */
  showErrorToast(userMessage, options = {}) {
    const { showRetry = false, retryAction = null, error, context } = options;

    const toastOptions = {
      duration: this.getToastDuration(userMessage.severity),
      style: this.getToastStyle(userMessage.severity),
      position: "top-right",
    };

    // Create toast message
    let message = userMessage.message;
    if (userMessage.guidance) {
      message += `\n\n💡 ${userMessage.guidance}`;
    }

    // Show toast
    const toastId = toast.error(message, toastOptions);

    // Add retry button if requested and actionable
    if (showRetry && retryAction && userMessage.actionable) {
      setTimeout(() => {
        // Show a separate retry toast with click handler
        toast.error(`${message}\n\n💡 Click this message to try again`, {
          ...toastOptions,
          duration: 10000, // Longer duration for retry messages
          onClick: () => {
            this.handleRetry(retryAction, error, context);
          },
        });
        toast.dismiss(toastId);
      }, 100);
    }
  }

  /**
   * Get toast duration based on severity
   * @param {string} severity - Error severity
   * @returns {number} Duration in milliseconds
   */
  getToastDuration(severity) {
    const durations = {
      low: 4000,
      medium: 6000,
      high: 8000,
    };
    return durations[severity] || 5000;
  }

  /**
   * Get toast style based on severity
   * @param {string} severity - Error severity
   * @returns {Object} Toast style
   */
  getToastStyle(severity) {
    const styles = {
      low: {
        background: "#FEF3C7",
        color: "#92400E",
        border: "1px solid #F59E0B",
      },
      medium: {
        background: "#FEE2E2",
        color: "#991B1B",
        border: "1px solid #EF4444",
      },
      high: {
        background: "#DC2626",
        color: "#FFFFFF",
        border: "1px solid #B91C1C",
      },
    };
    return styles[severity] || styles.medium;
  }

  /**
   * Handle retry logic with exponential backoff
   * @param {Function} retryAction - Action to retry
   * @param {Object} error - Original error
   * @param {Object} context - Error context
   */
  async handleRetry(retryAction, error, context) {
    const retryKey = `${context.component}-${context.operation}`;
    const attempts = this.retryAttempts.get(retryKey) || 0;

    if (attempts >= this.maxRetryAttempts) {
      toast.error(
        "Maximum retry attempts reached. Please refresh the page or contact support."
      );
      return;
    }

    this.retryAttempts.set(retryKey, attempts + 1);

    // Calculate delay with exponential backoff
    const delay = this.retryDelay * Math.pow(2, attempts);

    toast.loading(
      `Retrying... (Attempt ${attempts + 1}/${this.maxRetryAttempts})`,
      {
        duration: delay,
      }
    );

    try {
      await new Promise((resolve) => setTimeout(resolve, delay));
      await retryAction();

      // Reset retry count on success
      this.retryAttempts.delete(retryKey);
      toast.success("Operation completed successfully!");
    } catch (retryError) {
      this.handleError(
        retryError,
        {
          ...context,
          isRetry: true,
          retryAttempt: attempts + 1,
        },
        {
          showRetry: attempts + 1 < this.maxRetryAttempts,
          retryAction,
        }
      );
    }
  }

  /**
   * Handle document upload errors with role-specific guidance
   * @param {Error} error - Upload error
   * @param {string} userRole - User role
   * @param {Object} context - Additional context
   * @returns {Object} Processed error information
   */
  handleDocumentUploadError(error, userRole, context = {}) {
    const uploadContext = {
      ...context,
      operation: "document_upload",
      component: "DocumentUpload",
    };

    // Enhanced error processing for document uploads
    const processedError = this.handleError(error, uploadContext, {
      showToast: true,
      showRetry: true,
      retryAction: context.retryAction,
    });

    // Additional role-specific logging
    console.error(`📄 Document upload failed for ${userRole}:`, {
      error: processedError.error,
      context: uploadContext,
      userRole,
    });

    return processedError;
  }

  /**
   * Handle blockchain transaction errors with enhanced feedback
   * @param {Error} error - Transaction error
   * @param {string} operation - Blockchain operation type
   * @param {Object} context - Additional context
   * @returns {Object} Processed error information
   */
  handleBlockchainError(error, operation, context = {}) {
    const blockchainContext = {
      ...context,
      operation,
      component: "BlockchainService",
      type: "blockchain_error",
    };

    // Check for specific blockchain error patterns
    let enhancedError = { ...error };

    if (error.message?.includes("user rejected")) {
      enhancedError.code = "USER_REJECTED_TRANSACTION";
      enhancedError.type = "user_action";
    } else if (error.message?.includes("insufficient funds")) {
      enhancedError.code = "INSUFFICIENT_FUNDS";
      enhancedError.type = "blockchain_error";
    } else if (error.message?.includes("gas")) {
      enhancedError.code = "GAS_ERROR";
      enhancedError.type = "blockchain_error";
    } else if (error.message?.includes("network")) {
      enhancedError.code = "NETWORK_ERROR";
      enhancedError.type = "network_error";
    }

    return this.handleError(enhancedError, blockchainContext, {
      showToast: true,
      showRetry: operation !== "user_rejected", // Don't retry user rejections
      retryAction: context.retryAction,
    });
  }

  /**
   * Handle IPFS upload errors with retry logic
   * @param {Error} error - IPFS error
   * @param {Object} context - Additional context
   * @returns {Object} Processed error information
   */
  handleIPFSError(error, context = {}) {
    const ipfsContext = {
      ...context,
      operation: "ipfs_upload",
      component: "IPFSService",
      type: "upload_error",
    };

    // IPFS errors are usually retryable
    return this.handleError(error, ipfsContext, {
      showToast: true,
      showRetry: true,
      retryAction: context.retryAction,
    });
  }

  /**
   * Handle permission errors with role-specific guidance
   * @param {string} action - Attempted action
   * @param {string} userRole - User role
   * @param {Object} context - Additional context
   * @returns {Object} Processed error information
   */
  handlePermissionError(action, userRole, context = {}) {
    const permissionError = {
      message: `You do not have permission to ${action}`,
      code: "INSUFFICIENT_PERMISSIONS",
      type: "permission_error",
    };

    const permissionContext = {
      ...context,
      operation: action,
      component: "PermissionCheck",
      attemptedAction: action,
    };

    return this.handleError(permissionError, permissionContext, {
      showToast: true,
      showRetry: false, // Permission errors are not retryable
    });
  }

  /**
   * Log error for debugging and analytics
   * @param {Object} error - Normalized error
   * @param {Object} context - Error context
   */
  logError(error, context) {
    const logEntry = {
      error,
      context,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
    };

    // Add to error history
    this.errorHistory.push(logEntry);

    // Keep only last 50 errors
    if (this.errorHistory.length > 50) {
      this.errorHistory.shift();
    }

    // Store in localStorage for debugging
    try {
      const storedErrors = JSON.parse(
        localStorage.getItem("cblock_error_logs") || "[]"
      );
      storedErrors.push(logEntry);

      // Keep only last 100 errors
      if (storedErrors.length > 100) {
        storedErrors.splice(0, storedErrors.length - 100);
      }

      localStorage.setItem("cblock_error_logs", JSON.stringify(storedErrors));
    } catch (storageError) {
      console.warn("Failed to store error log:", storageError);
    }

    // Console log for development
    console.error("🚨 Error logged:", logEntry);
  }

  /**
   * Get or create session ID
   * @returns {string} Session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem("cblock_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      sessionStorage.setItem("cblock_session_id", sessionId);
    }
    return sessionId;
  }

  /**
   * Get error history for debugging
   * @returns {Array} Error history
   */
  getErrorHistory() {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.retryAttempts.clear();
    localStorage.removeItem("cblock_error_logs");
    console.log("🗑️ Error history cleared");
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byType: {},
      byComponent: {},
      byRole: {},
      recentErrors: this.errorHistory.slice(-10),
    };

    this.errorHistory.forEach((entry) => {
      const { error, context } = entry;

      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

      // Count by component
      stats.byComponent[context.component] =
        (stats.byComponent[context.component] || 0) + 1;

      // Count by role
      stats.byRole[context.userRole] =
        (stats.byRole[context.userRole] || 0) + 1;
    });

    return stats;
  }
}

// Create and export singleton instance
const errorHandler = new ErrorHandlerService();
export default errorHandler;
