import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { toast } from 'react-hot-toast';
import DocumentDetailsModal from '../DocumentDetailsModal.jsx';
import documentService, { DOCUMENT_STATUS } from '../../services/document.js';
import authService from '../../services/auth.js';
import blockchainService from '../../services/blockchain.js';

// Mock dependencies
vi.mock('react-hot-toast');
vi.mock('../../services/document.js');
vi.mock('../../services/auth.js');
vi.mock('../../services/blockchain.js');
vi.mock('../../utils/eip712.js', () => ({
    signAttestation: vi.fn(),
    validateAttestationData: vi.fn(),
    createAttestationData: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }) => children,
}));

describe('DocumentDetailsModal Attestation', () => {
    const mockDocument = {
        id: 'doc-123',
        cid: 'QmTestCID123',
        filename: 'test-document.pdf',
        fileSize: 1024000,
        projectName: 'Test Carbon Project',
        projectType: 'Reforestation',
        description: 'Test project description',
        location: 'Test Location',
        estimatedCredits: 100,
        uploadedBy: '0x1234567890123456789012345678901234567890',
        uploaderName: 'Test User',
        uploaderEmail: 'test@example.com',
        uploaderType: 'individual',
        status: DOCUMENT_STATUS.PENDING,
        createdAt: '2024-01-01T00:00:00Z',
    };

    const mockOnClose = vi.fn();
    const mockOnDocumentUpdate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock auth service
        authService.getCurrentUser.mockReturnValue({
            walletAddress: '0xverifier123',
            accountType: 'verifier',
        });
        authService.isVerifier.mockReturnValue(true);

        // Mock blockchain service
        blockchainService.getSigner.mockResolvedValue({
            signTypedData: vi.fn().mockResolvedValue('0xsignature123'),
        });
        blockchainService.getContractAddress.mockReturnValue('0xcontract123');
        blockchainService.getNonce.mockResolvedValue(0);

        // Mock document service
        documentService.formatFileSize.mockReturnValue('1.0 MB');
        documentService.attestDocument.mockResolvedValue({
            success: true,
            document: { ...mockDocument, status: DOCUMENT_STATUS.ATTESTED },
        });
    });

    it('renders document details correctly', () => {
        render(
            <DocumentDetailsModal
                document={mockDocument}
                onClose={mockOnClose}
                onDocumentUpdate={mockOnDocumentUpdate}
            />
        );

        expect(screen.getByText('Test Carbon Project')).toBeInTheDocument();
        expect(screen.getAllByText('test-document.pdf')).toHaveLength(2); // Header and file info section
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('Pending Review')).toBeInTheDocument();
        expect(screen.getByText('Document Information')).toBeInTheDocument();
    });

    it('shows attestation button for pending documents', () => {
        render(
            <DocumentDetailsModal
                document={mockDocument}
                onClose={mockOnClose}
                onDocumentUpdate={mockOnDocumentUpdate}
            />
        );

        expect(screen.getByRole('button', { name: /attest document/i })).toBeInTheDocument();
    });

    it('opens attestation form when Attest Document is clicked', async () => {
        render(
            <DocumentDetailsModal
                document={mockDocument}
                onClose={mockOnClose}
                onDocumentUpdate={mockOnDocumentUpdate}
            />
        );

        // Click the button (not the header) to open the form
        const attestButton = screen.getByRole('button', { name: /attest document/i });
        fireEvent.click(attestButton);

        await waitFor(() => {
            expect(screen.getByLabelText('Gold Standard Project ID *')).toBeInTheDocument();
            expect(screen.getByLabelText('Gold Standard Serial Number *')).toBeInTheDocument();
            expect(screen.getByLabelText('Credits to Mint *')).toBeInTheDocument();
        });
    });

    it('validates required fields in attestation form', async () => {
        render(
            <DocumentDetailsModal
                document={mockDocument}
                onClose={mockOnClose}
                onDocumentUpdate={mockOnDocumentUpdate}
            />
        );

        // Click the button to open the form
        const attestButton = screen.getByRole('button', { name: /attest document/i });
        fireEvent.click(attestButton);

        await waitFor(() => {
            expect(screen.getByLabelText('Gold Standard Project ID *')).toBeInTheDocument();
        });

        // Try to submit without filling required fields - should show validation errors
        const submitButton = screen.getByRole('button', { name: /attest document/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Gold Standard Project ID is required')).toBeInTheDocument();
            expect(screen.getByText('Gold Standard Serial Number is required')).toBeInTheDocument();
        });
    });

    it('submits attestation successfully', async () => {
        const { signAttestation, validateAttestationData, createAttestationData } = await import('../../utils/eip712.js');

        signAttestation.mockResolvedValue('0xsignature123');
        validateAttestationData.mockReturnValue(true);
        createAttestationData.mockReturnValue({
            gsProjectId: 'GS12345',
            gsSerial: 'GS12345-001-2024',
            ipfsCid: mockDocument.cid,
            amount: 100,
            recipient: mockDocument.uploadedBy,
            nonce: 0,
        });

        render(
            <DocumentDetailsModal
                document={mockDocument}
                onClose={mockOnClose}
                onDocumentUpdate={mockOnDocumentUpdate}
            />
        );

        // Click the button to open the form
        const attestButton = screen.getByRole('button', { name: /attest document/i });
        fireEvent.click(attestButton);

        await waitFor(() => {
            fireEvent.change(screen.getByLabelText('Gold Standard Project ID *'), {
                target: { value: 'GS12345' },
            });
            fireEvent.change(screen.getByLabelText('Gold Standard Serial Number *'), {
                target: { value: 'GS12345-001-2024' },
            });
        });

        // Click the submit button in the form
        const submitButton = screen.getByRole('button', { name: /attest document/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(documentService.attestDocument).toHaveBeenCalledWith(
                mockDocument.id,
                expect.objectContaining({
                    signature: '0xsignature123',
                })
            );
            expect(toast.success).toHaveBeenCalledWith('Document attested successfully!');
            expect(mockOnDocumentUpdate).toHaveBeenCalled();
        });
    });

    it('handles attestation errors gracefully', async () => {
        const { signAttestation, validateAttestationData, createAttestationData } = await import('../../utils/eip712.js');

        signAttestation.mockRejectedValue(new Error('user rejected transaction'));
        validateAttestationData.mockReturnValue(true);
        createAttestationData.mockReturnValue({
            gsProjectId: 'GS12345',
            gsSerial: 'GS12345-001-2024',
            ipfsCid: mockDocument.cid,
            amount: 100,
            recipient: mockDocument.uploadedBy,
            nonce: 0,
        });

        render(
            <DocumentDetailsModal
                document={mockDocument}
                onClose={mockOnClose}
                onDocumentUpdate={mockOnDocumentUpdate}
            />
        );

        // Click the button to open the form
        const attestButton = screen.getByRole('button', { name: /attest document/i });
        fireEvent.click(attestButton);

        await waitFor(() => {
            fireEvent.change(screen.getByLabelText('Gold Standard Project ID *'), {
                target: { value: 'GS12345' },
            });
            fireEvent.change(screen.getByLabelText('Gold Standard Serial Number *'), {
                target: { value: 'GS12345-001-2024' },
            });
        });

        // Click the submit button in the form
        const submitButton = screen.getByRole('button', { name: /attest document/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Signature was rejected. Please try again.');
            expect(screen.getByText('Signature was rejected. Please try again.')).toBeInTheDocument();
        });
    });

    it('shows attested status for already attested documents', () => {
        const attestedDocument = {
            ...mockDocument,
            status: DOCUMENT_STATUS.ATTESTED,
            attestation: {
                verifierAddress: '0xverifier123',
                attestedAt: '2024-01-01T12:00:00Z',
                gsProjectId: 'GS12345',
                gsSerial: 'GS12345-001-2024',
                amount: 100,
            },
        };

        render(
            <DocumentDetailsModal
                document={attestedDocument}
                onClose={mockOnClose}
                onDocumentUpdate={mockOnDocumentUpdate}
            />
        );

        expect(screen.getByText('Attested')).toBeInTheDocument();
        expect(screen.getByText('Attestation Information')).toBeInTheDocument();
        expect(screen.getByText('GS12345')).toBeInTheDocument();
        expect(screen.getByText('GS12345-001-2024')).toBeInTheDocument();
    });

    it('shows minted status for minted documents', () => {
        const mintedDocument = {
            ...mockDocument,
            status: DOCUMENT_STATUS.MINTED,
        };

        render(
            <DocumentDetailsModal
                document={mintedDocument}
                onClose={mockOnClose}
                onDocumentUpdate={mockOnDocumentUpdate}
            />
        );

        expect(screen.getByText('Minted')).toBeInTheDocument();
    });

    it('shows rejected status for rejected documents', () => {
        const rejectedDocument = {
            ...mockDocument,
            status: DOCUMENT_STATUS.REJECTED,
        };

        render(
            <DocumentDetailsModal
                document={rejectedDocument}
                onClose={mockOnClose}
                onDocumentUpdate={mockOnDocumentUpdate}
            />
        );

        expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    it('closes modal when close button is clicked', () => {
        render(
            <DocumentDetailsModal
                document={mockDocument}
                onClose={mockOnClose}
                onDocumentUpdate={mockOnDocumentUpdate}
            />
        );

        fireEvent.click(screen.getByText('Close'));
        expect(mockOnClose).toHaveBeenCalled();
    });
});