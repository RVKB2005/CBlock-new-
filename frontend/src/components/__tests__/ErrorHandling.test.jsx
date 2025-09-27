import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toast } from 'react-hot-toast';
import ErrorBoundary from '../ErrorBoundary.jsx';
import { LoadingSpinner, DocumentUploadLoading, BlockchainTransactionLoading } from '../LoadingStates.jsx';
import toastNotifications from '../ToastNotifications.jsx';
import errorHandler from '../../services/errorHandler.js';
import retryService from '../../services/retryService.js';
import authService from '../../services/auth.js';

// Mock dependencies
vi.mock('react-hot-toast');
vi.mock('../../services/auth.js');
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        button: ({ children, ...props }) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
}));

// Test component that throws an error
const ErrorThrowingComponent = ({ shouldThrow = false }) => {
    if (shouldThrow) {
        throw new Error('Test error for error boundary');
    }
    return <div>Normal component</div>;
};

describe('Error Handling System', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authService.getCurrentUser.mockReturnValue({
            accountType: 'individual',
            firstName: 'Test',
            email: 'test@example.com'
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('ErrorBoundary Component', () => {
        it('should render children when no error occurs', () => {
            render(
                <ErrorBoundary componentName="TestComponent">
                    <ErrorThrowingComponent shouldThrow={false} />
                </ErrorBoundary>
            );

            expect(screen.getByText('Normal component')).toBeInTheDocument();
        });

        it('should catch and display error with role-specific messaging', () => {
            // Mock console.error to avoid test output noise
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            render(
                <ErrorBoundary componentName="TestComponent">
                    <ErrorThrowingComponent shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText(/Individual Account Error/i)).toBeInTheDocument();
            expect(screen.getByText(/There was an issue with the individual user interface/i)).toBeInTheDocument();
            expect(screen.getByText(/Try refreshing the page/i)).toBeInTheDocument();

            consoleSpy.mockRestore();
        });

        it('should show retry button when retries are available', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            render(
                <ErrorBoundary componentName="TestComponent" maxRetries={3}>
                    <ErrorThrowingComponent shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText('Try Again')).toBeInTheDocument();

            consoleSpy.mockRestore();
        });

        it('should display different messages for different user roles', () => {
            authService.getCurrentUser.mockReturnValue({
                accountType: 'verifier',
                firstName: 'Test Verifier',
                email: 'verifier@example.com'
            });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            render(
                <ErrorBoundary componentName="TestComponent">
                    <ErrorThrowingComponent shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText(/Verifier Dashboard Error/i)).toBeInTheDocument();
            expect(screen.getByText(/verifier interface/i)).toBeInTheDocument();

            consoleSpy.mockRestore();
        });
    });

    describe('Loading States', () => {
        it('should render LoadingSpinner with role-specific messages', () => {
            render(
                <LoadingSpinner
                    message="Loading..."
                    userRole="verifier"
                    operation="document_review"
                />
            );

            expect(screen.getByText(/Loading documents for verification/i)).toBeInTheDocument();
        });

        it('should render DocumentUploadLoading with progress', () => {
            render(
                <DocumentUploadLoading
                    stage="uploading"
                    progress={50}
                    fileName="test-document.pdf"
                    userRole="individual"
                />
            );

            expect(screen.getByText(/Uploading to IPFS/i)).toBeInTheDocument();
            expect(screen.getByText(/50%/)).toBeInTheDocument();
            expect(screen.getByText(/test-document.pdf/i)).toBeInTheDocument();
        });

        it('should render BlockchainTransactionLoading', () => {
            render(
                <BlockchainTransactionLoading
                    operation="attestation"
                    userRole="verifier"
                    transactionHash="0x123456789"
                />
            );

            expect(screen.getByText(/Processing Attestation/i)).toBeInTheDocument();
            expect(screen.getByText(/0x123456789/)).toBeInTheDocument();
        });
    });

    describe('Toast Notifications', () => {
        it('should show role-specific success messages', () => {
            const mockToast = vi.fn();
            toast.success = mockToast;

            toastNotifications.documentUploadSuccess('test-doc.pdf', 'individual');

            expect(mockToast).toHaveBeenCalledWith(
                expect.stringContaining('Document "test-doc.pdf" uploaded successfully'),
                expect.objectContaining({
                    icon: '📄',
                    roleSpecific: true,
                    operation: 'document_upload'
                })
            );
        });

        it('should show role-specific error messages', () => {
            const mockToast = vi.fn();
            toast.error = mockToast;

            toastNotifications.documentUploadError('Upload failed', 'business');

            expect(mockToast).toHaveBeenCalledWith(
                expect.stringContaining('Business document upload failed'),
                expect.objectContaining({
                    icon: '📄❌',
                    roleSpecific: true,
                    operation: 'upload_error'
                })
            );
        });

        it('should show permission error messages', () => {
            const mockToast = vi.fn();
            toast.error = mockToast;

            toastNotifications.permissionError('attest documents', 'individual');

            expect(mockToast).toHaveBeenCalledWith(
                expect.stringContaining('Individual users cannot attest documents'),
                expect.objectContaining({
                    icon: '🚫',
                    roleSpecific: true,
                    operation: 'permission_error'
                })
            );
        });

        it('should show blockchain transaction notifications', () => {
            const mockToastLoading = vi.fn();
            const mockToastSuccess = vi.fn();
            toast.loading = mockToastLoading;
            toast.success = mockToastSuccess;

            toastNotifications.transactionPending('attestation', 'verifier');
            expect(mockToastLoading).toHaveBeenCalledWith(
                expect.stringContaining('Verifier attestation transaction submitted'),
                expect.objectContaining({
                    icon: '⛓️',
                    id: 'transaction-attestation'
                })
            );

            toastNotifications.transactionSuccess('attestation', 'verifier', '0x123');
            expect(mockToastSuccess).toHaveBeenCalledWith(
                expect.stringContaining('Verifier attestation completed successfully'),
                expect.objectContaining({
                    icon: '⛓️✅',
                    roleSpecific: true,
                    operation: 'blockchain_success'
                })
            );
        });
    });

    describe('Error Handler Service', () => {
        it('should handle and categorize errors correctly', () => {
            const networkError = new Error('Network connection failed');
            const result = errorHandler.handleError(networkError, {
                userRole: 'individual',
                component: 'TestComponent',
                operation: 'test_operation'
            });

            expect(result.error.type).toBe('network_error');
            expect(result.message.title).toBe('Connection Error');
            expect(result.message.guidance).toContain('Check your internet connection');
        });

        it('should provide role-specific error guidance', () => {
            const permissionError = new Error('Access denied');
            permissionError.code = 'INSUFFICIENT_PERMISSIONS';

            const result = errorHandler.handleError(permissionError, {
                userRole: 'individual',
                component: 'VerifierDashboard',
                operation: 'access_dashboard'
            });

            expect(result.message.guidance).toContain('Individual users can upload documents but cannot perform verifications');
        });

        it('should handle document upload errors with retry logic', () => {
            const uploadError = new Error('File too large');
            uploadError.code = 'FILE_TOO_LARGE';

            const result = errorHandler.handleDocumentUploadError(uploadError, 'business', {
                fileName: 'large-file.pdf',
                fileSize: 15000000,
                retryAction: vi.fn()
            });

            expect(result.message.message).toContain('File is too large');
            expect(result.message.guidance).toContain('business document upload failed');
        });

        it('should handle blockchain errors with gas optimization', () => {
            const gasError = new Error('Transaction underpriced');
            gasError.code = 'REPLACEMENT_UNDERPRICED';

            const result = errorHandler.handleBlockchainError(gasError, 'minting', {
                userRole: 'verifier',
                retryAction: vi.fn()
            });

            expect(result.message.guidance).toContain('wallet connection and gas fees');
        });
    });

    describe('Retry Service', () => {
        it('should retry operations with exponential backoff', async () => {
            let attempts = 0;
            const failingOperation = vi.fn(() => {
                attempts++;
                if (attempts < 3) {
                    const error = new Error('Network error');
                    error.type = 'NETWORK_ERROR';
                    throw error;
                }
                return 'success';
            });

            const result = await retryService.executeWithRetry(failingOperation, {
                maxRetries: 3,
                baseDelay: 100
            });

            expect(result).toBe('success');
            expect(failingOperation).toHaveBeenCalledTimes(3);
        });

        it('should not retry non-retryable errors', async () => {
            const nonRetryableOperation = vi.fn(() => {
                const error = new Error('Validation error');
                error.type = 'VALIDATION_ERROR';
                throw error;
            });

            await expect(
                retryService.executeWithRetry(nonRetryableOperation, {
                    maxRetries: 3
                })
            ).rejects.toThrow('Validation error');

            expect(nonRetryableOperation).toHaveBeenCalledTimes(1);
        });

        it('should handle blockchain transactions with gas optimization', async () => {
            let gasPrice = 1000000000; // 1 gwei
            const transactionFn = vi.fn((currentGasPrice) => {
                if (currentGasPrice < 1500000000) { // Less than 1.5 gwei
                    const error = new Error('Transaction underpriced');
                    error.message = 'replacement transaction underpriced';
                    throw error;
                }
                return { hash: '0x123', gasPrice: currentGasPrice };
            });

            const result = await retryService.retryBlockchainTransaction(transactionFn, {
                initialGasPrice: gasPrice,
                maxRetries: 3
            });

            expect(result.gasPrice).toBeGreaterThan(gasPrice);
            expect(result.hash).toBe('0x123');
        });
    });

    describe('Integration Tests', () => {
        it('should handle complete error flow from component to notification', async () => {
            const mockToast = vi.fn();
            toast.error = mockToast;

            // Simulate a component error
            const TestComponent = () => {
                const handleClick = () => {
                    try {
                        throw new Error('Test operation failed');
                    } catch (error) {
                        errorHandler.handleError(error, {
                            userRole: 'individual',
                            component: 'TestComponent',
                            operation: 'test_click'
                        }, {
                            showToast: true,
                            showRetry: true,
                            retryAction: vi.fn()
                        });
                    }
                };

                return <button onClick={handleClick}>Test Button</button>;
            };

            render(<TestComponent />);

            fireEvent.click(screen.getByText('Test Button'));

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith(
                    expect.stringContaining('An error occurred'),
                    expect.objectContaining({
                        duration: expect.any(Number)
                    })
                );
            });
        });

        it('should handle error boundary with retry functionality', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            let shouldThrow = true;

            const RetryableComponent = () => {
                if (shouldThrow) {
                    throw new Error('Retryable error');
                }
                return <div>Success after retry</div>;
            };

            const { rerender } = render(
                <ErrorBoundary componentName="RetryableComponent" maxRetries={3}>
                    <RetryableComponent />
                </ErrorBoundary>
            );

            // Should show error boundary
            expect(screen.getByText(/RetryableComponent Error/i)).toBeInTheDocument();
            expect(screen.getByText('Try Again')).toBeInTheDocument();

            // Simulate retry success
            shouldThrow = false;
            fireEvent.click(screen.getByText('Try Again'));

            // Should show success after retry
            expect(screen.getByText('Success after retry')).toBeInTheDocument();

            consoleSpy.mockRestore();
        });
    });
});