import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdminDashboard from '../AdminDashboard.jsx';
import adminService from '../../services/admin.js';
import authService from '../../services/auth.js';

// Mock services
vi.mock('../../services/admin.js', () => ({
    default: {
        isAdmin: vi.fn(),
        getAllUsers: vi.fn(),
        getAuditLogs: vi.fn(),
        getSystemStats: vi.fn(),
        changeUserRole: vi.fn(),
        assignVerifierCredentials: vi.fn(),
        createBackup: vi.fn(),
    }
}));

vi.mock('../../services/auth.js', () => ({
    default: {
        getCurrentUser: vi.fn(),
    }
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        button: ({ children, ...props }) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('AdminDashboard', () => {
    const mockUsers = [
        {
            id: 'user1',
            name: 'John Doe',
            email: 'john@test.com',
            accountType: 'individual',
            status: 'active',
            lastActivity: '2024-01-01T00:00:00Z'
        },
        {
            id: 'user2',
            name: 'Jane Smith',
            email: 'jane@test.com',
            accountType: 'verifier',
            status: 'active',
            lastActivity: '2024-01-02T00:00:00Z'
        }
    ];

    const mockAuditLogs = [
        {
            id: 'log1',
            type: 'role_change',
            adminEmail: 'admin@test.com',
            timestamp: '2024-01-01T00:00:00Z',
            details: { oldRole: 'individual', newRole: 'verifier' }
        }
    ];

    const mockStats = {
        totalUsers: 2,
        activeVerifiers: 1,
        totalAuditLogs: 1,
        credentialsManaged: 1,
        roleCounts: {
            individual: 1,
            verifier: 1
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();

        adminService.isAdmin.mockReturnValue(true);
        adminService.getAllUsers.mockResolvedValue(mockUsers);
        adminService.getAuditLogs.mockResolvedValue(mockAuditLogs);
        adminService.getSystemStats.mockResolvedValue(mockStats);

        authService.getCurrentUser.mockReturnValue({
            id: 'admin1',
            email: 'admin@test.com',
            accountType: 'admin'
        });
    });

    describe('Access Control', () => {
        it('should render dashboard for admin users', async () => {
            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
            });
        });

        it('should show access denied for non-admin users', async () => {
            adminService.isAdmin.mockReturnValue(false);

            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Access Denied')).toBeInTheDocument();
            });
        });

        it('should display loading state initially', () => {
            adminService.getAllUsers.mockImplementation(() => new Promise(() => { })); // Never resolves

            render(<AdminDashboard />);

            expect(screen.getByRole('generic')).toHaveClass('animate-spin');
        });
    });

    describe('System Statistics', () => {
        it('should display system statistics correctly', async () => {
            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Total Users')).toBeInTheDocument();
                expect(screen.getByText('2')).toBeInTheDocument();
                expect(screen.getByText('Active Verifiers')).toBeInTheDocument();
                expect(screen.getByText('1')).toBeInTheDocument();
            });
        });
    });

    describe('User Management Tab', () => {
        it('should display users table', async () => {
            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
                expect(screen.getByText('john@test.com')).toBeInTheDocument();
                expect(screen.getByText('Jane Smith')).toBeInTheDocument();
                expect(screen.getByText('jane@test.com')).toBeInTheDocument();
            });
        });

        it('should filter users by search term', async () => {
            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            const searchInput = screen.getByPlaceholderText('Search users...');
            fireEvent.change(searchInput, { target: { value: 'Jane' } });

            expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });

        it('should filter users by role', async () => {
            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            const roleFilter = screen.getByDisplayValue('All Roles');
            fireEvent.change(roleFilter, { target: { value: 'verifier' } });

            expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });

        it('should open user management modal', async () => {
            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            const manageButtons = screen.getAllByText('Manage');
            fireEvent.click(manageButtons[0]);

            expect(screen.getByText('Manage User: John Doe')).toBeInTheDocument();
        });
    });

    describe('Audit Logs Tab', () => {
        it('should switch to audit logs tab', async () => {
            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
            });

            const auditTab = screen.getByText('Audit Logs');
            fireEvent.click(auditTab);

            expect(screen.getByText('admin@test.com')).toBeInTheDocument();
        });

        it('should filter audit logs by type', async () => {
            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
            });

            const auditTab = screen.getByText('Audit Logs');
            fireEvent.click(auditTab);

            const typeFilter = screen.getByDisplayValue('All Types');
            fireEvent.change(typeFilter, { target: { value: 'role_change' } });

            expect(screen.getByText('admin@test.com')).toBeInTheDocument();
        });
    });

    describe('Backup Tab', () => {
        it('should switch to backup tab', async () => {
            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
            });

            const backupTab = screen.getByText('Backup & Recovery');
            fireEvent.click(backupTab);

            expect(screen.getByText('Data Backup & Recovery')).toBeInTheDocument();
            expect(screen.getByText('Create Backup')).toBeInTheDocument();
        });

        it('should open backup modal', async () => {
            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
            });

            const backupTab = screen.getByText('Backup & Recovery');
            fireEvent.click(backupTab);

            const createBackupButton = screen.getByText('Create Backup');
            fireEvent.click(createBackupButton);

            expect(screen.getByText('Create Data Backup')).toBeInTheDocument();
        });
    });

    describe('User Role Management', () => {
        it('should change user role', async () => {
            adminService.changeUserRole.mockResolvedValue({
                id: 'user1',
                accountType: 'verifier'
            });

            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            const manageButtons = screen.getAllByText('Manage');
            fireEvent.click(manageButtons[0]);

            const roleSelect = screen.getByDisplayValue('individual');
            fireEvent.change(roleSelect, { target: { value: 'verifier' } });

            const reasonTextarea = screen.getByPlaceholderText('Enter reason for role change...');
            fireEvent.change(reasonTextarea, { target: { value: 'Promotion to verifier' } });

            const updateButton = screen.getByText('Update Role');
            fireEvent.click(updateButton);

            await waitFor(() => {
                expect(adminService.changeUserRole).toHaveBeenCalledWith(
                    'user1',
                    'verifier',
                    'Promotion to verifier'
                );
            });
        });

        it('should validate role change reason', async () => {
            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            const manageButtons = screen.getAllByText('Manage');
            fireEvent.click(manageButtons[0]);

            const roleSelect = screen.getByDisplayValue('individual');
            fireEvent.change(roleSelect, { target: { value: 'verifier' } });

            const updateButton = screen.getByText('Update Role');
            fireEvent.click(updateButton);

            // Should not call the service without reason
            expect(adminService.changeUserRole).not.toHaveBeenCalled();
        });
    });

    describe('Verifier Credentials Management', () => {
        it('should open credentials modal for verifiers', async () => {
            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            });

            const credentialsButtons = screen.getAllByText('Credentials');
            fireEvent.click(credentialsButtons[0]);

            expect(screen.getByText('Manage Verifier Credentials: Jane Smith')).toBeInTheDocument();
        });

        it('should update verifier credentials', async () => {
            adminService.assignVerifierCredentials.mockResolvedValue({
                status: 'active',
                certificationId: 'CERT123'
            });

            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            });

            const credentialsButtons = screen.getAllByText('Credentials');
            fireEvent.click(credentialsButtons[0]);

            const certIdInput = screen.getByLabelText('Certification ID');
            fireEvent.change(certIdInput, { target: { value: 'CERT123' } });

            const authorityInput = screen.getByLabelText('Issuing Authority');
            fireEvent.change(authorityInput, { target: { value: 'Test Authority' } });

            const validUntilInput = screen.getByLabelText('Valid Until');
            fireEvent.change(validUntilInput, { target: { value: '2025-12-31' } });

            const updateButton = screen.getByText('Update Credentials');
            fireEvent.click(updateButton);

            await waitFor(() => {
                expect(adminService.assignVerifierCredentials).toHaveBeenCalledWith(
                    'user2',
                    {
                        certificationId: 'CERT123',
                        issuingAuthority: 'Test Authority',
                        validUntil: '2025-12-31'
                    }
                );
            });
        });
    });

    describe('Backup Operations', () => {
        it('should create backup file', async () => {
            const mockBackupData = {
                version: '1.0',
                timestamp: '2024-01-01T00:00:00Z',
                users: [],
                auditLogs: [],
                verifierCredentials: []
            };

            adminService.createBackup.mockResolvedValue(mockBackupData);

            // Mock URL.createObjectURL and related functions
            global.URL.createObjectURL = vi.fn(() => 'mock-url');
            global.URL.revokeObjectURL = vi.fn();

            const mockLink = {
                href: '',
                download: '',
                click: vi.fn()
            };
            vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => { });
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => { });

            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
            });

            const backupTab = screen.getByText('Backup & Recovery');
            fireEvent.click(backupTab);

            const createBackupButton = screen.getByText('Create Backup');
            fireEvent.click(createBackupButton);

            const confirmButton = screen.getByRole('button', { name: 'Create Backup' });
            fireEvent.click(confirmButton);

            await waitFor(() => {
                expect(adminService.createBackup).toHaveBeenCalled();
                expect(mockLink.click).toHaveBeenCalled();
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error messages', async () => {
            adminService.getAllUsers.mockRejectedValue(new Error('Failed to load users'));

            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load users')).toBeInTheDocument();
            });
        });

        it('should allow dismissing error messages', async () => {
            adminService.getAllUsers.mockRejectedValue(new Error('Test error'));

            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Test error')).toBeInTheDocument();
            });

            const dismissButton = screen.getByText('Dismiss');
            fireEvent.click(dismissButton);

            expect(screen.queryByText('Test error')).not.toBeInTheDocument();
        });

        it('should handle role change errors', async () => {
            adminService.changeUserRole.mockRejectedValue(new Error('Role change failed'));

            render(<AdminDashboard />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            const manageButtons = screen.getAllByText('Manage');
            fireEvent.click(manageButtons[0]);

            const roleSelect = screen.getByDisplayValue('individual');
            fireEvent.change(roleSelect, { target: { value: 'verifier' } });

            const reasonTextarea = screen.getByPlaceholderText('Enter reason for role change...');
            fireEvent.change(reasonTextarea, { target: { value: 'Test' } });

            const updateButton = screen.getByText('Update Role');
            fireEvent.click(updateButton);

            await waitFor(() => {
                expect(screen.getByText('Role change failed')).toBeInTheDocument();
            });
        });
    });
});