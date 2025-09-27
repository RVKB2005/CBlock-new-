import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toast } from 'react-hot-toast';
import VerifierDashboard from '../VerifierDashboard';
import documentService, { DOCUMENT_STATUS } from '../../services/document';
import authService from '../../services/auth';

// Mock dependencies
vi.mock('react-hot-toast');
vi.mock('../../services/document');
vi.mock('../../services/auth');

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('VerifierDashboard', () => {
    const mockDocuments = [
        {
            id: 'doc1',
            cid: 'QmTest1',
            projectName: 'Solar Farm Project',
            projectType: 'Renewable Energy',
            description: 'Large scale solar installation',
            location: 'California, USA',
            estimatedCredits: 1000,
            filename: 'solar-project.pdf',
            fileSize: 2048000,
            uploaderName: 'John Doe',
            uploaderEmail: 'john@example.com',
            uploaderType: 'individual',
            status: DOCUMENT_STATUS.PENDING,
            createdAt: '2024-01-15T10:00:00Z',
        },
        {
            id: 'doc2',
            cid: 'QmTest2',
            projectName: 'Wind Energy Initiative',
            projectType: 'Renewable Energy',
            description: 'Wind turbine installation',
            location: 'Texas, USA',
            estimatedCredits: 1500,
            filename: 'wind-project.pdf',
            fileSize: 3072000,
            uploaderName: 'Acme Corp',
            uploaderEmail: 'contact@acme.com',
            uploaderType: 'business',
            status: DOCUMENT_STATUS.ATTESTED,
            createdAt: '2024-01-14T09:00:00Z',
        },
        {
            id: 'doc3',
            cid: 'QmTest3',
            projectName: 'Forest Conservation',
            projectType: 'Conservation',
            description: 'Forest protection project',
            location: 'Oregon, USA',
            estimatedCredits: 800,
            filename: 'forest-project.pdf',
            fileSize: 1536000,
            uploaderName: 'Jane Smith',
            uploaderEmail: 'jane@example.com',
            uploaderType: 'individual',
            status: DOCUMENT_STATUS.MINTED,
            createdAt: '2024-01-13T08:00:00Z',
        },
    ];

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Mock auth service
        authService.isUserAuthenticated.mockReturnValue(true);
        authService.isVerifier.mockReturnValue(true);
        authService.getCurrentUser.mockReturnValue({
            id: 'verifier1',
            email: 'verifier@example.com',
            accountType: 'verifier',
        });

        // Mock document service
        documentService.getDocumentsForVerifier.mockResolvedValue(mockDocuments);
        documentService.formatFileSize.mockImplementation((bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        });

        // Mock toast
        toast.error = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Component Rendering', () => {
        it('renders the verifier dashboard with header and statistics', async () => {
            render(<VerifierDashboard />);

            // Wait for documents to load first
            await waitFor(() => {
                expect(screen.getByText('Verifier Dashboard')).toBeInTheDocument();
            });

            // Check header
            expect(screen.getByText(/Review and verify documents/)).toBeInTheDocument();

            // Check statistics
            expect(screen.getByText('Total Documents')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument(); // Total count
            expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1); // At least stats card
            expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // At least one count
            expect(screen.getAllByText('Attested').length).toBeGreaterThanOrEqual(1);
            expect(screen.getAllByText('Minted').length).toBeGreaterThanOrEqual(1);
        });

        it('displays documents in a table format', async () => {
            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
                expect(screen.getByText('Wind Energy Initiative')).toBeInTheDocument();
                expect(screen.getByText('Forest Conservation')).toBeInTheDocument();
            });

            // Check table headers
            expect(screen.getByText('Project')).toBeInTheDocument();
            expect(screen.getByText('Uploader')).toBeInTheDocument();
            expect(screen.getByText('Status')).toBeInTheDocument();
            expect(screen.getByText('Credits')).toBeInTheDocument();
            expect(screen.getByText('Uploaded')).toBeInTheDocument();
            expect(screen.getByText('Actions')).toBeInTheDocument();
        });

        it('shows correct uploader information and types', async () => {
            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
                expect(screen.getByText('Acme Corp')).toBeInTheDocument();
                expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            });

            // Check uploader types
            expect(screen.getAllByText('individual')).toHaveLength(2);
            expect(screen.getByText('business')).toBeInTheDocument();
        });

        it('displays correct status badges', async () => {
            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Pending')).toBeInTheDocument();
                expect(screen.getByText('Attested')).toBeInTheDocument();
                expect(screen.getByText('Minted')).toBeInTheDocument();
            });
        });
    });

    describe('Search and Filtering', () => {
        it('filters documents by search term', async () => {
            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
            });

            // Search for "solar"
            const searchInput = screen.getByPlaceholderText(/Search documents/);
            fireEvent.change(searchInput, { target: { value: 'solar' } });

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
                expect(screen.queryByText('Wind Energy Initiative')).not.toBeInTheDocument();
                expect(screen.queryByText('Forest Conservation')).not.toBeInTheDocument();
            });
        });

        it('shows and hides filter options', async () => {
            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
            });

            // Initially filter labels should be hidden (but table headers are visible)
            expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();

            // Click filters button
            const filtersButton = screen.getByText('Filters');
            fireEvent.click(filtersButton);

            // Now filter labels should be visible
            await waitFor(() => {
                expect(screen.getByLabelText('Status')).toBeInTheDocument();
                expect(screen.getByLabelText('Uploader Type')).toBeInTheDocument();
            });
        });

        it('filters documents by status', async () => {
            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
            });

            // Open filters
            fireEvent.click(screen.getByText('Filters'));

            await waitFor(() => {
                expect(screen.getByLabelText('Status')).toBeInTheDocument();
            });

            // Filter by pending status
            const statusSelect = screen.getByDisplayValue('All Status');
            fireEvent.change(statusSelect, { target: { value: DOCUMENT_STATUS.PENDING } });

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
                expect(screen.queryByText('Wind Energy Initiative')).not.toBeInTheDocument();
                expect(screen.queryByText('Forest Conservation')).not.toBeInTheDocument();
            });
        });

        it('filters documents by uploader type', async () => {
            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
            });

            // Open filters
            fireEvent.click(screen.getByText('Filters'));

            await waitFor(() => {
                expect(screen.getByLabelText('Uploader Type')).toBeInTheDocument();
            });

            // Filter by business users
            const uploaderTypeSelect = screen.getByDisplayValue('All Users');
            fireEvent.change(uploaderTypeSelect, { target: { value: 'business' } });

            await waitFor(() => {
                expect(screen.getByText('Wind Energy Initiative')).toBeInTheDocument();
                expect(screen.queryByText('Solar Farm Project')).not.toBeInTheDocument();
                expect(screen.queryByText('Forest Conservation')).not.toBeInTheDocument();
            });
        });

        it('clears all filters when clear button is clicked', async () => {
            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
            });

            // Apply search filter
            const searchInput = screen.getByPlaceholderText(/Search documents/);
            fireEvent.change(searchInput, { target: { value: 'solar' } });

            // Open filters and apply status filter
            fireEvent.click(screen.getByText('Filters'));
            await waitFor(() => {
                expect(screen.getByLabelText('Status')).toBeInTheDocument();
            });

            const statusSelect = screen.getByDisplayValue('All Status');
            fireEvent.change(statusSelect, { target: { value: DOCUMENT_STATUS.PENDING } });

            // Clear all filters
            const clearButton = screen.getByText('Clear all');
            fireEvent.click(clearButton);

            await waitFor(() => {
                expect(searchInput.value).toBe('');
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
                expect(screen.getByText('Wind Energy Initiative')).toBeInTheDocument();
                expect(screen.getByText('Forest Conservation')).toBeInTheDocument();
            });
        });
    });

    describe('Document Details', () => {
        it('opens document details modal when view button is clicked', async () => {
            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
            });

            // Click view button for first document
            const viewButtons = screen.getAllByText('View');
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getByText('Document Details')).toBeInTheDocument();
                expect(screen.getByText('Project Information')).toBeInTheDocument();
                expect(screen.getByText('Uploader Information')).toBeInTheDocument();
                expect(screen.getByText('File Information')).toBeInTheDocument();
            });
        });

        it('closes document details modal when close button is clicked', async () => {
            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
            });

            // Open modal
            const viewButtons = screen.getAllByText('View');
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getByText('Document Details')).toBeInTheDocument();
            });

            // Close modal
            const closeButton = screen.getByText('Close');
            fireEvent.click(closeButton);

            await waitFor(() => {
                expect(screen.queryByText('Document Details')).not.toBeInTheDocument();
            });
        });
    });

    describe('Pagination', () => {
        it('shows pagination when there are more than 10 documents', async () => {
            // Create more than 10 documents
            const manyDocuments = Array.from({ length: 15 }, (_, i) => ({
                ...mockDocuments[0],
                id: `doc${i + 1}`,
                projectName: `Project ${i + 1}`,
            }));

            documentService.getDocumentsForVerifier.mockResolvedValue(manyDocuments);

            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Showing 1 to 10 of 15 documents')).toBeInTheDocument();
            });

            // Check pagination controls
            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument();
        });

        it('navigates to next page when pagination button is clicked', async () => {
            // Create more than 10 documents
            const manyDocuments = Array.from({ length: 15 }, (_, i) => ({
                ...mockDocuments[0],
                id: `doc${i + 1}`,
                projectName: `Project ${i + 1}`,
            }));

            documentService.getDocumentsForVerifier.mockResolvedValue(manyDocuments);

            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Project 1')).toBeInTheDocument();
            });

            // Click page 2
            const page2Button = screen.getByText('2');
            fireEvent.click(page2Button);

            await waitFor(() => {
                expect(screen.getByText('Showing 11 to 15 of 15 documents')).toBeInTheDocument();
                expect(screen.getByText('Project 11')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('shows error message when document loading fails', async () => {
            const errorMessage = 'Failed to load documents';
            documentService.getDocumentsForVerifier.mockRejectedValue(new Error(errorMessage));

            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Error Loading Documents')).toBeInTheDocument();
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
            });

            expect(toast.error).toHaveBeenCalledWith(`Failed to load documents: ${errorMessage}`);
        });

        it('shows access denied error for non-verifiers', async () => {
            authService.isVerifier.mockReturnValue(false);
            documentService.getDocumentsForVerifier.mockRejectedValue(
                new Error('Access denied. Verifier privileges required.')
            );

            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Error Loading Documents')).toBeInTheDocument();
                expect(screen.getByText('Access denied. Verifier privileges required.')).toBeInTheDocument();
            });
        });

        it('shows try again button and retries loading on click', async () => {
            const errorMessage = 'Network error';
            documentService.getDocumentsForVerifier
                .mockRejectedValueOnce(new Error(errorMessage))
                .mockResolvedValueOnce(mockDocuments);

            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Error Loading Documents')).toBeInTheDocument();
            });

            // Click try again
            const tryAgainButton = screen.getByText('Try Again');
            fireEvent.click(tryAgainButton);

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
            });

            expect(documentService.getDocumentsForVerifier).toHaveBeenCalledTimes(2);
        });
    });

    describe('Loading States', () => {
        it('shows loading spinner while documents are being fetched', async () => {
            // Mock a delayed response
            documentService.getDocumentsForVerifier.mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve(mockDocuments), 100))
            );

            render(<VerifierDashboard />);

            expect(screen.getByText('Loading Documents')).toBeInTheDocument();
            expect(screen.getByText('Fetching documents for verification...')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
            });
        });
    });

    describe('Empty States', () => {
        it('shows empty state when no documents are available', async () => {
            documentService.getDocumentsForVerifier.mockResolvedValue([]);

            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('No Documents Found')).toBeInTheDocument();
                expect(screen.getByText('No documents have been uploaded yet.')).toBeInTheDocument();
            });
        });

        it('shows filtered empty state when no documents match filters', async () => {
            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
            });

            // Apply a filter that matches no documents
            const searchInput = screen.getByPlaceholderText(/Search documents/);
            fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

            await waitFor(() => {
                expect(screen.getByText('No Documents Found')).toBeInTheDocument();
                expect(screen.getByText('No documents match your current filters.')).toBeInTheDocument();
                expect(screen.getByText('Clear filters to see all documents')).toBeInTheDocument();
            });
        });
    });

    describe('Refresh Functionality', () => {
        it('refreshes documents when refresh button is clicked', async () => {
            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Solar Farm Project')).toBeInTheDocument();
            });

            // Click refresh button
            const refreshButton = screen.getByText('Refresh');
            fireEvent.click(refreshButton);

            expect(documentService.getDocumentsForVerifier).toHaveBeenCalledTimes(2);
        });
    });

    describe('Authentication Checks', () => {
        it('handles unauthenticated user', async () => {
            authService.isUserAuthenticated.mockReturnValue(false);
            documentService.getDocumentsForVerifier.mockRejectedValue(
                new Error('Please log in to access the verifier dashboard')
            );

            render(<VerifierDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Error Loading Documents')).toBeInTheDocument();
                expect(screen.getByText('Please log in to access the verifier dashboard')).toBeInTheDocument();
            });
        });
    });
});