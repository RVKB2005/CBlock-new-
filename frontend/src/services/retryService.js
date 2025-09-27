import { toast } from "react-hot-toast";
import errorHandler from "./errorHandler.js";

/**
 * Retry Service for Failed Operations
 * Implements exponential backoff and intelligent retry logic
 */

class RetryService {
  constructor() {
    this.defaultConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      retryableErrors: [
        "NETWORK_ERROR",
        "TIMEOUT_ERROR",
        "SERVER_ERROR",
        "RATE_LIMITED",
        "BLOCKCHAIN_CONGESTION",
      ],
    };
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - The operation to retry
   * @param {Object} config - Retry configuration
   * @returns {Promise} - Result of the operation
   */
  async executeWithRetry(operation, config = {}) {
    const retryConfig = { ...this.defaultConfig, ...config };
    let lastError;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();

        // Success - clear any previous error notifications
        if (attempt > 0) {
          toast.success(`Operation succeeded after ${attempt} retries`);
        }

        return result;
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!this.isRetryableError(error, retryConfig.retryableErrors)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt),
          retryConfig.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        // Show retry notification
        toast.loading(
          `Retrying operation... (${attempt + 1}/${retryConfig.maxRetries})`,
          {
            duration: jitteredDelay,
          }
        );

        await this.delay(jitteredDelay);
      }
    }

    // All retries exhausted
    errorHandler.handleError(lastError, {
      context: "retry_service",
      maxRetriesExceeded: true,
      totalAttempts: retryConfig.maxRetries + 1,
    });

    throw lastError;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - The error to check
   * @param {Array} retryableErrors - List of retryable error types
   * @returns {boolean} - Whether the error is retryable
   */
  isRetryableError(error, retryableErrors) {
    // Check error type
    if (retryableErrors.includes(error.type)) {
      return true;
    }

    // Check HTTP status codes
    if (error.status) {
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
      return retryableStatusCodes.includes(error.status);
    }

    // Check blockchain-specific errors
    if (error.code) {
      const retryableBlockchainCodes = [
        "NETWORK_ERROR",
        "TIMEOUT",
        "SERVER_ERROR",
        "REPLACEMENT_UNDERPRICED",
        "NONCE_EXPIRED",
      ];
      return retryableBlockchainCodes.includes(error.code);
    }

    // Check error message patterns
    const retryablePatterns = [
      /network error/i,
      /timeout/i,
      /rate limit/i,
      /congestion/i,
      /temporary/i,
    ];

    return retryablePatterns.some((pattern) =>
      pattern.test(error.message || "")
    );
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Promise that resolves after delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry blockchain transaction with gas optimization
   * @param {Function} transactionFn - Function that returns transaction
   * @param {Object} config - Retry configuration
   * @returns {Promise} - Transaction result
   */
  async retryBlockchainTransaction(transactionFn, config = {}) {
    const blockchainConfig = {
      ...this.defaultConfig,
      maxRetries: 5,
      gasMultiplier: 1.1,
      ...config,
    };

    let gasPrice = config.initialGasPrice;

    const operation = async () => {
      try {
        const tx = await transactionFn(gasPrice);
        return tx;
      } catch (error) {
        // Increase gas price for next retry if gas-related error
        if (this.isGasRelatedError(error)) {
          gasPrice = gasPrice
            ? Math.floor(gasPrice * blockchainConfig.gasMultiplier)
            : undefined;
        }
        throw error;
      }
    };

    return this.executeWithRetry(operation, blockchainConfig);
  }

  /**
   * Check if error is gas-related
   * @param {Error} error - The error to check
   * @returns {boolean} - Whether the error is gas-related
   */
  isGasRelatedError(error) {
    const gasErrorPatterns = [
      /gas/i,
      /underpriced/i,
      /insufficient funds/i,
      /out of gas/i,
    ];

    return gasErrorPatterns.some((pattern) =>
      pattern.test(error.message || "")
    );
  }

  /**
   * Retry with circuit breaker pattern
   * @param {string} operationId - Unique identifier for the operation
   * @param {Function} operation - The operation to retry
   * @param {Object} config - Configuration including circuit breaker settings
   * @returns {Promise} - Result of the operation
   */
  async executeWithCircuitBreaker(operationId, operation, config = {}) {
    const circuitConfig = {
      failureThreshold: 5,
      resetTimeout: 60000,
      ...config,
    };

    // Simple in-memory circuit breaker state
    if (!this.circuitStates) {
      this.circuitStates = new Map();
    }

    const state = this.circuitStates.get(operationId) || {
      failures: 0,
      lastFailure: null,
      state: "CLOSED", // CLOSED, OPEN, HALF_OPEN
    };

    // Check circuit breaker state
    if (state.state === "OPEN") {
      const timeSinceLastFailure = Date.now() - state.lastFailure;
      if (timeSinceLastFailure < circuitConfig.resetTimeout) {
        throw new Error(`Circuit breaker is OPEN for ${operationId}`);
      } else {
        state.state = "HALF_OPEN";
      }
    }

    try {
      const result = await this.executeWithRetry(operation, config);

      // Reset circuit breaker on success
      state.failures = 0;
      state.state = "CLOSED";
      this.circuitStates.set(operationId, state);

      return result;
    } catch (error) {
      state.failures++;
      state.lastFailure = Date.now();

      if (state.failures >= circuitConfig.failureThreshold) {
        state.state = "OPEN";
        toast.error(`Circuit breaker opened for ${operationId}`);
      }

      this.circuitStates.set(operationId, state);
      throw error;
    }
  }
}

export default new RetryService();
