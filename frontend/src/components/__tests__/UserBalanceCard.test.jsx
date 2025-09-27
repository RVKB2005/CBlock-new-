import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { toast } from 'react-hot-toast';
import UserBalanceCard from '../UserBalanceCard.jsx';
import creditAllocationService from '../../services/creditAllocation.js';
import authService from '../../services/auth.js';

// Mock dependencies
vi.mock('react-hot-toast');
vi.mock('../../services/creditAllocation.js');
vi.mock('../../services/auth.js');

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        button: ({ children, ...props }) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('UserBalanceCard', () => {
    const mockUser = {
        walletAddress: '0x123456789',
        name: 'Test User',
        email: 'test@example.com',
    };

    const mockBalanceInfo = {
        currentBalance: 150,
        totalAllocated: 200,
        totalAllocations: 3,
        recentAllocations: [
            {
                id: 'alloc_1',
                amount: 100,
                documentName: 'Project A',
                status: 'completed',
                allocatedAt: '2024-01-15T10:00:00Z',
                transactionHash: '0xabc123def456',
            },
            {
                id: 'alloc_2',
                amount: 50,
                documentName: 'Project B',
                status: 'failed',
                needsRetry: true,
                createdAt: '2024-01-14T09:00:00Z',
            },
        ],
        pendingAllocations: [
            {
                id: 'alloc_2',
                amount: 50,
                documentName: 'Project B',
                status: 'failed',
                needsRetry: true,
            },
        ],
        tokens: [
            { tokenId: 1, balance: 100 },
            { tokenId: 2, balance: 50 },
        ],
        lastUpdated: '2024-01-15T12:00:00Z',
    };

    beforeEach(() => {
        vi.clearAllMocks();

        authService.getCurrentUser.mockReturnValue(mockUser);
        creditAllocationService.getUserBalanceInfo.mockResolvedValue(mockBalanceInfo);
        creditAllocationService.retryFailedAllocation.mockResolvedValue({
            success: true,
            allocation: { id: 'alloc_2', status: 'completed' },
        });
    });

    it('should render loading state initially', () => {
        creditAllocationService.getUserBalanceInfo.mockImplementation(
            () => new Promise(() => { }) // Never resolves
        );

        render(<UserBalanceCard />);

        expect(screen.getByText('Loading balance...')).toBeInTheDocument();
    });

    it('should render balance information when loaded', async () => {
        render(<UserBalanceCard />);

        await waitFor(() => {
            expect(screen.getByText('Credit Balance')).toBeInTheDocument();
        });

        expect(screen.getByText('150')).toBeInTheDocument(); // Current balance
        expect(screen.getByText('200')).toBeInTheDocument(); // Total allocated
        expect(screen.getByText('3')).toBeInTheDocument(); // Total allocations
    });

    it('should show pending allocations alert', async () => {
        render(<UserBalanceCard />);

        await waitFor(() => {
            expect(screen.getByText(/1 pending allocation/)).toBeInTheDocument();
        });

        expect(screen.getByText(/Some credit allocations are still being processed/)).toBeInTheDocument();
    });

    it('should toggle allocation history', async () => {
        render(<UserBalanceCard showDetails={false} />);

        await waitFor(() => {
            expect(screen.getByText('Recent Allocations (2)')).toBeInTheDocument();
        });

        // Initially collapsed
        expect(screen.queryByText('Project A')).not.toBeInTheDocument();

        // Click to expand
        fireEvent.click(screen.getByText('Recent Allocations (2)'));

        await waitFor(() => {
            expect(screen.getByText('Project A')).toBeInTheDocument();
            expect(screen.getByText('Project B')).toBeInTheDocument();
        });
    });

    it('should show allocation details in history', async () => {
        render(<UserBalanceCard showDetails={true} />);

        await waitFor(() => {
            expect(screen.getByText('Project A')).toBeInTheDocument();
        });

        expect(screen.getByText('100 credits')).toBeInTheDocument();
        expect(screen.getByText('50 credits')).toBeInTheDocument();
        expect(screen.getByText(/0xabc123...def456/)).toBeInTheDocument();
    });

    it('should handle retry failed allocation', async () => {
        render(<UserBalanceCard showDetails={true} />);

        await waitFor(() => {
            expect(screen.getByText('Retry')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => {
            expect(creditAllocationService.retryFailedAllocation).toHaveBeenCalledWith('alloc_2');
        });

        expect(toast.success).toHaveBeenCalledWith('Credit allocation retry successful!');
    });

    it('should handle retry failure', async () => {
        creditAllocationService.retryFailedAllocation.mockResolvedValue({
            success: false,
            allocation: { id: 'alloc_2', status: 'failed' },
        });

        render(<UserBalanceCard showDetails={true} />);

        await waitFor(() => {
            expect(screen.getByText('Retry')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Credit allocation retry failed');
        });
    });

    it('should handle retry error', async () => {
        creditAllocationService.retryFailedAllocation.mockRejectedValue(
            new Error('Network error')
        );

        render(<UserBalanceCard showDetails={true} />);

        await waitFor(() => {
            expect(screen.getByText('Retry')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Retry failed: Network error');
        });
    });

    it('should refresh balance information', async () => {
        render(<UserBalanceCard />);

        await waitFor(() => {
            expect(screen.getByText('Credit Balance')).toBeInTheDocument();
        });

        // Click refresh button
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        fireEvent.click(refreshButton);

        await waitFor(() => {
            expect(creditAllocationService.getUserBalanceInfo).toHaveBeenCalledTimes(2);
        });
    });

    it('should show error state', async () => {
        creditAllocationService.getUserBalanceInfo.mockRejectedValue(
            new Error('Failed to load balance')
        );

        render(<UserBalanceCard />);

        await waitFor(() => {
            expect(screen.getByText('Error loading balance')).toBeInTheDocument();
        });

        expect(screen.getByText('Failed to load balance')).toBeInTheDocument();
        expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('should handle error retry', async () => {
        creditAllocationService.getUserBalanceInfo
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce(mockBalanceInfo);

        render(<UserBalanceCard />);

        await waitFor(() => {
            expect(screen.getByText('Try again')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Try again'));

        await waitFor(() => {
            expect(screen.getByText('Credit Balance')).toBeInTheDocument();
        });
    });

    it('should not render when user is not authenticated', () => {
        authService.getCurrentUser.mockReturnValue(null);

        const { container } = render(<UserBalanceCard />);

        expect(container.firstChild).toBeNull();
    });

    it('should show no balance info message', async () => {
        creditAllocationService.getUserBalanceInfo.mockResolvedValue(null);

        render(<UserBalanceCard />);

        await waitFor(() => {
            expect(screen.getByText('No balance information available')).toBeInTheDocument();
        });

        expect(screen.getByText('Connect your wallet to view credits')).toBeInTheDocument();
    });

    it('should show no allocations message', async () => {
        const emptyBalanceInfo = {
            ...mockBalanceInfo,
            totalAllocations: 0,
            recentAllocations: [],
            pendingAllocations: [],
        };

        creditAllocationService.getUserBalanceInfo.mockResolvedValue(emptyBalanceInfo);

        render(<UserBalanceCard />);

        await waitFor(() => {
            expect(screen.getByText('No credit allocations yet')).toBeInTheDocument();
        });

        expect(screen.getByText(/Upload documents for verification/)).toBeInTheDocument();
    });

    it('should format amounts correctly', async () => {
        const largeBalanceInfo = {
            ...mockBalanceInfo,
            currentBalance: 1234567,
            totalAllocated: 9876543,
        };

        creditAllocationService.getUserBalanceInfo.mockResolvedValue(largeBalanceInfo);

        render(<UserBalanceCard />);

        await waitFor(() => {
            expect(screen.getByText('1,234,567')).toBeInTheDocument();
            expect(screen.getByText('9,876,543')).toBeInTheDocument();
        });
    });

    it('should handle different allocation statuses', async () => {
        const multiStatusBalanceInfo = {
            ...mockBalanceInfo,
            recentAllocations: [
                {
                    id: 'alloc_1',
                    amount: 100,
                    documentName: 'Completed Project',
                    status: 'completed',
                    allocatedAt: '2024-01-15T10:00:00Z',
                },
                {
                    id: 'alloc_2',
                    amount: 50,
                    documentName: 'Failed Project',
                    status: 'failed',
                    needsRetry: true,
                    createdAt: '2024-01-14T09:00:00Z',
                },
                {
                    id: 'alloc_3',
                    amount: 75,
                    documentName: 'Pending Project',
                    status: 'pending',
                    createdAt: '2024-01-13T08:00:00Z',
                },
            ],
        };

        creditAllocationService.getUserBalanceInfo.mockResolvedValue(multiStatusBalanceInfo);

        render(<UserBalanceCard showDetails={true} />);

        await waitFor(() => {
            expect(screen.getByText('Completed Project')).toBeInTheDocument();
            expect(screen.getByText('Failed Project')).toBeInTheDocument();
            expect(screen.getByText('Pending Project')).toBeInTheDocument();
        });

        // Should show retry button only for failed allocation
        expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
        const { container } = render(<UserBalanceCard className="custom-class" />);

        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should show details by default when showDetails is true', async () => {
        render(<UserBalanceCard showDetails={true} />);

        await waitFor(() => {
            expect(screen.getByText('Project A')).toBeInTheDocument();
        });
    });
});