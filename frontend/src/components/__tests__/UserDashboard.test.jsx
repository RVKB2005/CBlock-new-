import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import UserDashboard from '../UserDashboard.jsx';
import authService from '../../services/auth.js';
import creditAllocationService from '../../services/creditAllocation.js';
import documentService from '../../services/document.js';
import blockchainService from '../../services/blockchain.js';

// Mock services
vi.mock('../../services/auth.js');
vi.mock('../../services/creditAllocation.js');
vi.mock('../../services/document.js');
vi.mock('../../services/blockchain.js');
vi.mock('react-hot-toast');

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        button: ({ children, ...props }) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }) => <div>{children}</div>,
}));

describe('UserDashboard Component', () => {
    const mockUser = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        accountType: 'individual',
    };

    const mockBalanceInfo = {
        currentBalance: 1500,
        totalAllocated: 2000,
        totalAllocations: 5,
        recentAllocations: [
            {
                id: 'alloc1',
                amount: 500,
                documentName: 'Solar Project',
                status: 'completed',
                allocatedAt: '2024-01-15T10:00:00Z',
                transactionHash: '0xabcdef123456',
            },
        ],
        pendingAllocations: [],
    };

    const mockDocuments = [
        {
            id: 'doc1',
            projectName: 'Wind Farm Project',
            status: 'minted',
            estimatedCredits: 1000,
            createdAt: '2024-01-10T10:00:00Z',
            filename: 'wind-farm.pdf',
            fileSize: 1024000,
        },
        {
            id: 'doc2',
            projectName: 'Solar Panel Installation',
            status: 'pending',
            estimatedCredits: 500,
            createdAt: '2024-01-12T10:00:00Z',
            filename: 'solar-panels.pdf',
            fileSize: 2048000,
        },
    ];

    const mockDocumentStats = {
        total: 2,
        pending: 1,
        attested: 0,
        minted: 1,
        rejected: 0,
    };

    const mockTokens = [
        {
            tokenId: 1,
            balance: 1000,
            gsProjectId: 'GS001',
            gsSerial: 'ABC123',
        },
    ];

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Mock auth service
        authService.getCurrentUser.mockReturnValue(mockUser);

        // Mock credit allocation service
        creditAllocationService.getUserBalanceInfo.mockResolvedValue(mockBalanceInfo);
        creditAllocationService.getUserAllocations.mockResolvedValue(mockBalanceInfo.recentAllocations);

        // Mock document service
        documentService.getUserDocuments.mockResolvedValue(mockDocuments);
        documentService.getDocumentStats.mockResolvedValue(mockDocumentStats);

        // Mock blockchain service
        blockchainService.getUserTokens.mockResolvedValue(mockTokens);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('renders dashboard header correctly', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByText('My Dashboard')).toBeInTheDocument();
                expect(screen.getByText('Track your carbon credits, documents, and verification progress')).toBeInTheDocument();
            });
        });

        it('displays loading state initially', () => {
            render(<UserDashboard />);

            expect(screen.getByText('My Dashboard')).toBeInTheDocument();
            // Loading animation should be present
            expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
        });

        it('renders quick stats cards', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Current Balance')).toBeInTheDocument();
                expect(screen.getByText('Total Documents')).toBeInTheDocument();
                expect(screen.getByText('Credits Earned')).toBeInTheDocument();
                expect(screen.getByText('Verification Rate')).toBeInTheDocument();
            });
        });

        it('renders tab navigation', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Overview')).toBeInTheDocument();
                expect(screen.getByText('Documents')).toBeInTheDocument();
                expect(screen.getByText('Transactions')).toBeInTheDocument();
                expect(screen.getByText('Portfolio')).toBeInTheDocument();
            });
        });
    });

    describe('Data Loading', () => {
        it('loads dashboard data on mount', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                expect(creditAllocationService.getUserBalanceInfo).toHaveBeenCalledWith(mockUser.walletAddress);
                expect(documentService.getUserDocuments).toHaveBeenCalled();
                expect(documentService.getDocumentStats).toHaveBeenCalled();
                expect(blockchainService.getUserTokens).toHaveBeenCalledWith(mockUser.walletAddress);
            });
        });

        it('handles loading errors gracefully', async () => {
            creditAllocationService.getUserBalanceInfo.mockRejectedValue(new Error('Network error'));

            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
                expect(screen.getByText('Network error')).toBeInTheDocument();
            });
        });

        it('shows no data message when user has no wallet', async () => {
            authService.getCurrentUser.mockReturnValue({ ...mockUser, walletAddress: null });

            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByText('No Data Available')).toBeInTheDocument();
            });
        });
    });

    describe('Tab Navigation', () => {
        it('switches between tabs correctly', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Overview')).toBeInTheDocument();
            });

            // Click on Documents tab
            fireEvent.click(screen.getByText('Documents'));

            await waitFor(() => {
                expect(screen.getByText('Total')).toBeInTheDocument(); // Document stats
            });

            // Click on Transactions tab
            fireEvent.click(screen.getByText('Transactions'));

            await waitFor(() => {
                expect(screen.getByText('Total Credits Earned')).toBeInTheDocument();
            });

            // Click on Portfolio tab
            fireEvent.click(screen.getByText('Portfolio'));

            await waitFor(() => {
                expect(screen.getByText('Verification Rate')).toBeInTheDocument();
            });
        });

        it('highlights active tab correctly', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                const overviewTab = screen.getByText('Overview').closest('button');
                expect(overviewTab).toHaveClass('border-primary-500', 'text-primary-600');
            });

            fireEvent.click(screen.getByText('Documents'));

            await waitFor(() => {
                const documentsTab = screen.getByText('Documents').closest('button');
                expect(documentsTab).toHaveClass('border-primary-500', 'text-primary-600');
            });
        });
    });

    describe('Overview Tab', () => {
        it('displays recent documents', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Recent Documents')).toBeInTheDocument();
                expect(screen.getByText('Wind Farm Project')).toBeInTheDocument();
                expect(screen.getByText('Solar Panel Installation')).toBeInTheDocument();
            });
        });

        it('displays recent credit allocations', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Recent Credits')).toBeInTheDocument();
                expect(screen.getByText('+500 credits allocated')).toBeInTheDocument();
            });
        });

        it('shows empty state when no documents exist', async () => {
            documentService.getUserDocuments.mockResolvedValue([]);
            creditAllocationService.getUserAllocations.mockResolvedValue([]);

            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByText('No documents uploaded yet')).toBeInTheDocument();
                expect(screen.getByText('No credit allocations yet')).toBeInTheDocument();
            });
        });

        it('displays quick action buttons', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Upload Document')).toBeInTheDocument();
                expect(screen.getByText('View Tokens')).toBeInTheDocument();
                expect(screen.getByText('Marketplace')).toBeInTheDocument();
            });
        });
    });

    describe('Documents Tab', () => {
        beforeEach(async () => {
            render(<UserDashboard />);
            await waitFor(() => {
                fireEvent.click(screen.getByText('Documents'));
            });
        });

        it('displays document statistics', async () => {
            await waitFor(() => {
                expect(screen.getByText('2')).toBeInTheDocument(); // Total
                expect(screen.getByText('1')).toBeInTheDocument(); // Pending and Minted
            });
        });

        it('filters documents by status', async () => {
            await waitFor(() => {
                const filterSelect = screen.getByDisplayValue('All Documents');
                fireEvent.change(filterSelect, { target: { value: 'pending' } });
            });

            await waitFor(() => {
                expect(screen.getByText('Solar Panel Installation')).toBeInTheDocument();
                expect(screen.queryByText('Wind Farm Project')).not.toBeInTheDocument();
            });
        });

        it('sorts documents correctly', async () => {
            await waitFor(() => {
                const sortSelect = screen.getByDisplayValue('Newest First');
                fireEvent.change(sortSelect, { target: { value: 'name' } });
            });

            // Should sort alphabetically
            await waitFor(() => {
                const documentCards = screen.getAllByText(/Project/);
                expect(documentCards[0]).toHaveTextContent('Solar Panel Installation');
                expect(documentCards[1]).toHaveTextContent('Wind Farm Project');
            });
        });

        it('displays document cards with correct information', async () => {
            await waitFor(() => {
                expect(screen.getByText('Wind Farm Project')).toBeInTheDocument();
                expect(screen.getByText('1000 Credits')).toBeInTheDocument();
                expect(screen.getByText('minted')).toBeInTheDocument();
            });
        });
    });

    describe('Transactions Tab', () => {
        beforeEach(async () => {
            render(<UserDashboard />);
            await waitFor(() => {
                fireEvent.click(screen.getByText('Transactions'));
            });
        });

        it('displays transaction summary', async () => {
            await waitFor(() => {
                expect(screen.getByText('Total Credits Earned')).toBeInTheDocument();
                expect(screen.getByText('Successful Allocations')).toBeInTheDocument();
                expect(screen.getByText('Pending/Failed')).toBeInTheDocument();
            });
        });

        it('displays transaction cards', async () => {
            await waitFor(() => {
                expect(screen.getByText('+500 Credits')).toBeInTheDocument();
                expect(screen.getByText('From: Solar Project')).toBeInTheDocument();
                expect(screen.getByText('completed')).toBeInTheDocument();
            });
        });

        it('filters transactions by status', async () => {
            await waitFor(() => {
                const filterSelect = screen.getByDisplayValue('All Transactions');
                fireEvent.change(filterSelect, { target: { value: 'completed' } });
            });

            await waitFor(() => {
                expect(screen.getByText('+500 Credits')).toBeInTheDocument();
            });
        });
    });

    describe('Portfolio Tab', () => {
        beforeEach(async () => {
            render(<UserDashboard />);
            await waitFor(() => {
                fireEvent.click(screen.getByText('Portfolio'));
            });
        });

        it('displays portfolio metrics', async () => {
            await waitFor(() => {
                expect(screen.getByText('Total Documents')).toBeInTheDocument();
                expect(screen.getByText('Verification Rate')).toBeInTheDocument();
                expect(screen.getByText('Credits Earned')).toBeInTheDocument();
                expect(screen.getByText('Avg Credits/Doc')).toBeInTheDocument();
            });
        });

        it('displays document status breakdown', async () => {
            await waitFor(() => {
                expect(screen.getByText('Document Status')).toBeInTheDocument();
                expect(screen.getByText('Minted')).toBeInTheDocument();
                expect(screen.getByText('Attested')).toBeInTheDocument();
                expect(screen.getByText('Pending')).toBeInTheDocument();
            });
        });

        it('displays token holdings when available', async () => {
            await waitFor(() => {
                expect(screen.getByText('Token Holdings')).toBeInTheDocument();
                expect(screen.getByText('Token #1')).toBeInTheDocument();
                expect(screen.getByText('GS001 • ABC123')).toBeInTheDocument();
            });
        });
    });

    describe('Refresh Functionality', () => {
        it('refreshes data when refresh button is clicked', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                const refreshButton = screen.getByRole('button', { name: /refresh/i });
                fireEvent.click(refreshButton);
            });

            // Should call services again
            expect(creditAllocationService.getUserBalanceInfo).toHaveBeenCalledTimes(2);
            expect(documentService.getUserDocuments).toHaveBeenCalledTimes(2);
        });

        it('shows refreshing state', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                const refreshButton = screen.getByRole('button', { name: /refresh/i });
                fireEvent.click(refreshButton);
            });

            // Button should be disabled during refresh
            const refreshButton = screen.getByRole('button', { name: /refresh/i });
            expect(refreshButton).toBeDisabled();
        });
    });

    describe('Page Navigation', () => {
        it('calls onPageChange when navigation buttons are clicked', async () => {
            const mockOnPageChange = vi.fn();
            render(<UserDashboard onPageChange={mockOnPageChange} />);

            await waitFor(() => {
                const uploadButton = screen.getByText('Upload Document');
                fireEvent.click(uploadButton);
            });

            expect(mockOnPageChange).toHaveBeenCalledWith('mint');
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA labels and roles', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
                expect(screen.getByRole('tablist')).toBeInTheDocument();
            });
        });

        it('supports keyboard navigation', async () => {
            render(<UserDashboard />);

            await waitFor(() => {
                const documentsTab = screen.getByText('Documents');
                documentsTab.focus();
                fireEvent.keyDown(documentsTab, { key: 'Enter' });
            });

            await waitFor(() => {
                expect(screen.getByText('Document Status')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('displays error message when data loading fails', async () => {
            const errorMessage = 'Failed to load data';
            creditAllocationService.getUserBalanceInfo.mockRejectedValue(new Error(errorMessage));

            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
            });
        });

        it('provides retry functionality on error', async () => {
            creditAllocationService.getUserBalanceInfo.mockRejectedValueOnce(new Error('Network error'));
            creditAllocationService.getUserBalanceInfo.mockResolvedValueOnce(mockBalanceInfo);

            render(<UserDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
            });

            const retryButton = screen.getByText('Try again');
            fireEvent.click(retryButton);

            await waitFor(() => {
                expect(screen.getByText('My Dashboard')).toBeInTheDocument();
                expect(screen.queryByText('Error loading dashboard')).not.toBeInTheDocument();
            });
        });
    });

    describe('Real-time Updates', () => {
        it('sets up periodic refresh', async () => {
            vi.useFakeTimers();

            render(<UserDashboard />);

            await waitFor(() => {
                expect(creditAllocationService.getUserBalanceInfo).toHaveBeenCalledTimes(1);
            });

            // Fast-forward 1 minute
            act(() => {
                vi.advanceTimersByTime(60000);
            });

            await waitFor(() => {
                expect(creditAllocationService.getUserBalanceInfo).toHaveBeenCalledTimes(2);
            });

            vi.useRealTimers();
        });
    });
});