import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Upload from '../../Upload.jsx';
import documentService from '../../services/document.js';
import authService from '../../services/auth.js';

// Mock the services
vi.mock('../../services/document.js');
vi.mock('../../services/auth.js');

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        button: ({ children, ...props }) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock NotificationsContext
const mockAddNotification = vi.fn();
vi.mock('../../contexts/NotificationsContext', () => ({
    useNotifications: () => ({
        addNotification: mockAddNotification,
    }),
}));

describe('Upload Component', () => {
    const mockUser = {
        id: 'user1',
        name: 'Test User',
        email: 'test@example.com',
        accountType: 'individual',
        walletAddress: '0x123...',
    };

    const mockOnUploaded = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        documentService.getAllowedFileTypes.mockReturnValue([
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png',
        ]);

        documentService.getMaxFileSize.mockReturnValue(10 * 1024 * 1024); // 10MB

        documentService.formatFileSize.mockImplementation((bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        });

        documentService.validateFile.mockImplementation((file) => {
            if (!file) throw new Error('No file provided');
            if (file.size > 10 * 1024 * 1024) throw new Error('File too large');
            return true;
        });

        authService.getCurrentUser.mockReturnValue(mockUser);
    });

    it('renders file upload area initially', () => {
        render(<Upload onUploaded={mockOnUploaded} user={mockUser} />);

        expect(screen.getByText('Upload Project Document')).toBeInTheDocument();
        expect(screen.getByText('Drag and drop your file here')).toBeInTheDocument();
        expect(screen.getByText('Choose File')).toBeInTheDocument();
    });

    it('displays correct file size limit from DocumentService', () => {
        render(<Upload onUploaded={mockOnUploaded} user={mockUser} />);

        expect(screen.getByText('Maximum file size: 10 MB')).toBeInTheDocument();
    });

    it('shows file info after file selection', async () => {
        render(<Upload onUploaded={mockOnUploaded} user={mockUser} />);

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
        const fileInput = screen.getByRole('button', { name: /choose file/i }).parentElement.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText('File Selected')).toBeInTheDocument();
            expect(screen.getByText('test.pdf')).toBeInTheDocument();
            expect(screen.getByText('Continue')).toBeInTheDocument();
        });
    });

    it('shows metadata form after clicking continue', async () => {
        render(<Upload onUploaded={mockOnUploaded} user={mockUser} />);

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
        const fileInput = screen.getByRole('button', { name: /choose file/i }).parentElement.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText('Continue')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Continue'));

        await waitFor(() => {
            expect(screen.getByText('Project Details')).toBeInTheDocument();
            expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/project type/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/estimated credits/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
        });
    });

    it('validates required metadata fields', async () => {
        render(<Upload onUploaded={mockOnUploaded} user={mockUser} />);

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
        const fileInput = screen.getByRole('button', { name: /choose file/i }).parentElement.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            fireEvent.click(screen.getByText('Continue'));
        });

        await waitFor(() => {
            fireEvent.click(screen.getByText('Upload Document'));
        });

        await waitFor(() => {
            expect(screen.getByText('Project name is required')).toBeInTheDocument();
        });
    });

    it('calls DocumentService.uploadDocument with correct parameters', async () => {
        const mockUploadResult = {
            success: true,
            documentId: 'doc123',
            document: {
                id: 'doc123',
                cid: 'QmTest123',
                filename: 'test.pdf',
                fileSize: 1024,
                mimeType: 'application/pdf',
                projectName: 'Test Project',
                status: 'pending',
                ipfsUrl: 'https://ipfs.io/ipfs/QmTest123',
            },
            message: 'Document uploaded successfully',
        };

        documentService.uploadDocument.mockResolvedValue(mockUploadResult);

        render(<Upload onUploaded={mockOnUploaded} user={mockUser} />);

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
        const fileInput = screen.getByRole('button', { name: /choose file/i }).parentElement.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            fireEvent.click(screen.getByText('Continue'));
        });

        // Fill in metadata
        fireEvent.change(screen.getByLabelText(/project name/i), {
            target: { value: 'Test Project' },
        });

        fireEvent.change(screen.getByLabelText(/project type/i), {
            target: { value: 'Renewable Energy' },
        });

        fireEvent.change(screen.getByLabelText(/location/i), {
            target: { value: 'Test Location' },
        });

        fireEvent.change(screen.getByLabelText(/estimated credits/i), {
            target: { value: '100' },
        });

        fireEvent.change(screen.getByLabelText(/description/i), {
            target: { value: 'Test description' },
        });

        fireEvent.click(screen.getByText('Upload Document'));

        await waitFor(() => {
            expect(documentService.uploadDocument).toHaveBeenCalledWith(
                file,
                {
                    projectName: 'Test Project',
                    projectType: 'Renewable Energy',
                    location: 'Test Location',
                    estimatedCredits: '100',
                    description: 'Test description',
                }
            );
        });
    });

    it('shows success state after successful upload', async () => {
        const mockUploadResult = {
            success: true,
            documentId: 'doc123',
            document: {
                id: 'doc123',
                cid: 'QmTest123',
                filename: 'test.pdf',
                fileSize: 1024,
                mimeType: 'application/pdf',
                projectName: 'Test Project',
                status: 'pending',
                ipfsUrl: 'https://ipfs.io/ipfs/QmTest123',
            },
            message: 'Document uploaded successfully',
        };

        documentService.uploadDocument.mockResolvedValue(mockUploadResult);

        render(<Upload onUploaded={mockOnUploaded} user={mockUser} />);

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
        const fileInput = screen.getByRole('button', { name: /choose file/i }).parentElement.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            fireEvent.click(screen.getByText('Continue'));
        });

        // Fill in required metadata
        fireEvent.change(screen.getByLabelText(/project name/i), {
            target: { value: 'Test Project' },
        });

        fireEvent.click(screen.getByText('Upload Document'));

        await waitFor(() => {
            expect(screen.getByText('Document Uploaded Successfully! 🎉')).toBeInTheDocument();
            expect(screen.getByText('Test Project')).toBeInTheDocument();
            expect(screen.getByText('doc123')).toBeInTheDocument();
            expect(screen.getByText('QmTest123')).toBeInTheDocument();
        });
    });

    it('calls onUploaded callback with correct data', async () => {
        const mockUploadResult = {
            success: true,
            documentId: 'doc123',
            document: {
                id: 'doc123',
                cid: 'QmTest123',
                filename: 'test.pdf',
                fileSize: 1024,
                mimeType: 'application/pdf',
                projectName: 'Test Project',
                status: 'pending',
                ipfsUrl: 'https://ipfs.io/ipfs/QmTest123',
            },
            message: 'Document uploaded successfully',
        };

        documentService.uploadDocument.mockResolvedValue(mockUploadResult);

        render(<Upload onUploaded={mockOnUploaded} user={mockUser} />);

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
        const fileInput = screen.getByRole('button', { name: /choose file/i }).parentElement.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            fireEvent.click(screen.getByText('Continue'));
        });

        // Fill in required metadata
        fireEvent.change(screen.getByLabelText(/project name/i), {
            target: { value: 'Test Project' },
        });

        fireEvent.click(screen.getByText('Upload Document'));

        await waitFor(() => {
            expect(mockOnUploaded).toHaveBeenCalledWith({
                documentId: 'doc123',
                cid: 'QmTest123',
                url: 'https://ipfs.io/ipfs/QmTest123',
                name: 'test.pdf',
                size: 1024,
                type: 'application/pdf',
                projectName: 'Test Project',
                status: 'pending',
            });
        });
    });

    it('handles upload errors gracefully', async () => {
        const mockError = new Error('Upload failed');
        documentService.uploadDocument.mockRejectedValue(mockError);

        render(<Upload onUploaded={mockOnUploaded} user={mockUser} />);

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
        const fileInput = screen.getByRole('button', { name: /choose file/i }).parentElement.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            fireEvent.click(screen.getByText('Continue'));
        });

        // Fill in required metadata
        fireEvent.change(screen.getByLabelText(/project name/i), {
            target: { value: 'Test Project' },
        });

        fireEvent.click(screen.getByText('Upload Document'));

        await waitFor(() => {
            expect(documentService.uploadDocument).toHaveBeenCalled();
        });

        // Should not show success state
        expect(screen.queryByText('Document Uploaded Successfully!')).not.toBeInTheDocument();
    });

    it('resets form when clicking "Upload Another Document"', async () => {
        const mockUploadResult = {
            success: true,
            documentId: 'doc123',
            document: {
                id: 'doc123',
                cid: 'QmTest123',
                filename: 'test.pdf',
                fileSize: 1024,
                mimeType: 'application/pdf',
                projectName: 'Test Project',
                status: 'pending',
                ipfsUrl: 'https://ipfs.io/ipfs/QmTest123',
            },
            message: 'Document uploaded successfully',
        };

        documentService.uploadDocument.mockResolvedValue(mockUploadResult);

        render(<Upload onUploaded={mockOnUploaded} user={mockUser} />);

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
        const fileInput = screen.getByRole('button', { name: /choose file/i }).parentElement.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            fireEvent.click(screen.getByText('Continue'));
        });

        // Fill in required metadata
        fireEvent.change(screen.getByLabelText(/project name/i), {
            target: { value: 'Test Project' },
        });

        fireEvent.click(screen.getByText('Upload Document'));

        await waitFor(() => {
            expect(screen.getByText('Upload Another Document')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Upload Another Document'));

        await waitFor(() => {
            expect(screen.getByText('Drag and drop your file here')).toBeInTheDocument();
        });
    });

    it('validates file using DocumentService', async () => {
        const mockError = new Error('File too large');
        documentService.validateFile.mockImplementation(() => {
            throw mockError;
        });

        render(<Upload onUploaded={mockOnUploaded} user={mockUser} />);

        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
        const fileInput = screen.getByRole('button', { name: /choose file/i }).parentElement.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(documentService.validateFile).toHaveBeenCalledWith(file);

        // Should not proceed to file selected state
        expect(screen.queryByText('File Selected')).not.toBeInTheDocument();
    });
});