import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RoleGuard from '../RoleGuard.jsx';
import authService from '../../services/auth.js';

// Mock the auth service
vi.mock('../../services/auth.js', () => ({
    default: {
        getCurrentUser: vi.fn(),
        isUserAuthenticated: vi.fn(),
        hasPermission: vi.fn()
    }
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        button: ({ children, ...props }) => <button {...props}>{children}</button>
    }
}));

describe('RoleGuard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const TestContent = () => <div>Protected Content</div>;

    describe('Authentication Requirements', () => {
        it('should deny access when user is not authenticated', () => {
            authService.isUserAuthenticated.mockReturnValue(false);
            authService.getCurrentUser.mockReturnValue(null);

            render(
                <RoleGuard requireAuthentication={true}>
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Please log in to access this content')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });

        it('should allow access when authentication is not required', () => {
            authService.isUserAuthenticated.mockReturnValue(false);
            authService.getCurrentUser.mockReturnValue(null);

            render(
                <RoleGuard requireAuthentication={false}>
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });
    });

    describe('Role-Based Access Control', () => {
        beforeEach(() => {
            authService.isUserAuthenticated.mockReturnValue(true);
        });

        it('should allow access for users with correct role', () => {
            const mockUser = { accountType: 'verifier', email: 'test@example.com' };
            authService.getCurrentUser.mockReturnValue(mockUser);

            render(
                <RoleGuard allowedRoles={['verifier']} user={mockUser}>
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('should deny access for users with incorrect role', () => {
            const mockUser = { accountType: 'individual', email: 'test@example.com' };
            authService.getCurrentUser.mockReturnValue(mockUser);

            render(
                <RoleGuard allowedRoles={['verifier']} user={mockUser}>
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Access Denied')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });

        it('should allow access for users with any of multiple allowed roles', () => {
            const mockUser = { accountType: 'business', email: 'test@example.com' };
            authService.getCurrentUser.mockReturnValue(mockUser);

            render(
                <RoleGuard allowedRoles={['individual', 'business']} user={mockUser}>
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });
    });

    describe('Permission-Based Access Control', () => {
        beforeEach(() => {
            authService.isUserAuthenticated.mockReturnValue(true);
        });

        it('should allow access for users with required permissions', () => {
            const mockUser = { accountType: 'verifier', email: 'test@example.com' };
            authService.getCurrentUser.mockReturnValue(mockUser);
            authService.hasPermission.mockReturnValue(true);

            render(
                <RoleGuard requiredPermissions={['view_all_documents']} user={mockUser}>
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Protected Content')).toBeInTheDocument();
            expect(authService.hasPermission).toHaveBeenCalledWith('view_all_documents');
        });

        it('should deny access for users without required permissions', () => {
            const mockUser = { accountType: 'individual', email: 'test@example.com' };
            authService.getCurrentUser.mockReturnValue(mockUser);
            authService.hasPermission.mockReturnValue(false);

            render(
                <RoleGuard requiredPermissions={['view_all_documents']} user={mockUser}>
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Access Denied')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });

        it('should require all permissions when multiple are specified', () => {
            const mockUser = { accountType: 'verifier', email: 'test@example.com' };
            authService.getCurrentUser.mockReturnValue(mockUser);
            authService.hasPermission
                .mockReturnValueOnce(true)  // First permission check passes
                .mockReturnValueOnce(false); // Second permission check fails

            render(
                <RoleGuard requiredPermissions={['view_all_documents', 'attest_document']} user={mockUser}>
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Access Denied')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });
    });

    describe('Combined Role and Permission Checks', () => {
        beforeEach(() => {
            authService.isUserAuthenticated.mockReturnValue(true);
        });

        it('should allow access when both role and permissions match', () => {
            const mockUser = { accountType: 'verifier', email: 'test@example.com' };
            authService.getCurrentUser.mockReturnValue(mockUser);
            authService.hasPermission.mockReturnValue(true);

            render(
                <RoleGuard
                    allowedRoles={['verifier']}
                    requiredPermissions={['view_all_documents']}
                    user={mockUser}
                >
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('should deny access when role matches but permissions do not', () => {
            const mockUser = { accountType: 'verifier', email: 'test@example.com' };
            authService.getCurrentUser.mockReturnValue(mockUser);
            authService.hasPermission.mockReturnValue(false);

            render(
                <RoleGuard
                    allowedRoles={['verifier']}
                    requiredPermissions={['view_all_documents']}
                    user={mockUser}
                >
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Access Denied')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });
    });

    describe('No Restrictions', () => {
        it('should allow access when no roles or permissions are specified', () => {
            authService.isUserAuthenticated.mockReturnValue(true);
            const mockUser = { accountType: 'individual', email: 'test@example.com' };
            authService.getCurrentUser.mockReturnValue(mockUser);

            render(
                <RoleGuard user={mockUser}>
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });
    });

    describe('Custom Fallback', () => {
        it('should render custom fallback when access is denied', () => {
            const mockUser = { accountType: 'individual', email: 'test@example.com' };
            authService.getCurrentUser.mockReturnValue(mockUser);
            authService.isUserAuthenticated.mockReturnValue(true);

            const CustomFallback = () => <div>Custom Access Denied</div>;

            render(
                <RoleGuard
                    allowedRoles={['verifier']}
                    user={mockUser}
                    fallback={<CustomFallback />}
                >
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Custom Access Denied')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });
    });
});