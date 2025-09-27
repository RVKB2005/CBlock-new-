import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

// Import components and services
import RoleGuard from '../../components/RoleGuard.jsx';
import authService from '../../services/auth.js';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        button: ({ children, ...props }) => <button {...props}>{children}</button>,
    },
}));

const TestWrapper = ({ children }) => (
    <BrowserRouter>{children}</BrowserRouter>
);

describe('Comprehensive Role-Based Functionality Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset auth service state
        authService.currentUser = null;
        authService.isAuthenticated = false;
    });

    const testUsers = {
        individual: {
            email: 'individual@example.com',
            name: 'John Doe',
            accountType: 'individual',
            walletAddress: '0x123...abc',
        },
        business: {
            email: 'business@example.com',
            name: 'Jane Smith',
            accountType: 'business',
            organization: 'Green Corp',
            walletAddress: '0x456...def',
        },
        verifier: {
            email: 'verifier@example.com',
            name: 'Dr. Alice Johnson',
            accountType: 'verifier',
            walletAddress: '0x789...ghi',
        },
    };

    describe('Authentication Service Role Management', () => {
        describe('getUserRole', () => {
            it('should return correct role for each user type', () => {
                Object.entries(testUsers).forEach(([expectedRole, userData]) => {
                    authService.currentUser = userData;
                    expect(authService.getUserRole()).toBe(expectedRole);
                });
            });

            it('should return individual when user has no accountType', () => {
                authService.currentUser = { email: 'test@example.com' };
                expect(authService.getUserRole()).toBe('individual');
            });

            it('should return null when no user is logged in', () => {
                authService.currentUser = null;
                expect(authService.getUserRole()).toBe(null);
            });
        });

        describe('isVerifier', () => {
            it('should return true for verifier users', () => {
                authService.currentUser = testUsers.verifier;
                expect(authService.isVerifier()).toBe(true);
            });

            it('should return false for non-verifier users', () => {
                authService.currentUser = testUsers.individual;
                expect(authService.isVerifier()).toBe(false);

                authService.currentUser = testUsers.business;
                expect(authService.isVerifier()).toBe(false);
            });

            it('should return false when no user is logged in', () => {
                authService.currentUser = null;
                expect(authService.isVerifier()).toBe(false);
            });
        });

        describe('hasPermission', () => {
            it('should return correct permissions for individual users', () => {
                authService.currentUser = testUsers.individual;

                expect(authService.hasPermission('upload_document')).toBe(true);
                expect(authService.hasPermission('view_own_documents')).toBe(true);
                expect(authService.hasPermission('view_credits')).toBe(true);
                expect(authService.hasPermission('attest_document')).toBe(false);
                expect(authService.hasPermission('mint_credits')).toBe(false);
            });

            it('should return correct permissions for business users', () => {
                authService.currentUser = testUsers.business;

                expect(authService.hasPermission('upload_document')).toBe(true);
                expect(authService.hasPermission('view_own_documents')).toBe(true);
                expect(authService.hasPermission('view_credits')).toBe(true);
                expect(authService.hasPermission('attest_document')).toBe(false);
                expect(authService.hasPermission('mint_credits')).toBe(false);
            });

            it('should return correct permissions for verifier users', () => {
                authService.currentUser = testUsers.verifier;

                expect(authService.hasPermission('view_all_documents')).toBe(true);
                expect(authService.hasPermission('attest_document')).toBe(true);
                expect(authService.hasPermission('mint_credits')).toBe(true);
                expect(authService.hasPermission('view_verifier_dashboard')).toBe(true);
                expect(authService.hasPermission('upload_document')).toBe(false);
            });

            it('should return false for unknown permissions', () => {
                authService.currentUser = testUsers.verifier;
                expect(authService.hasPermission('unknown_permission')).toBe(false);
            });

            it('should return false when no user is logged in', () => {
                authService.currentUser = null;
                expect(authService.hasPermission('upload_document')).toBe(false);
            });
        });

        describe('isUserAuthenticated', () => {
            it('should return correct authentication status', () => {
                authService.isAuthenticated = false;
                authService.currentUser = null;
                expect(authService.isUserAuthenticated()).toBe(false);

                authService.isAuthenticated = true;
                authService.currentUser = testUsers.individual;
                expect(authService.isUserAuthenticated()).toBe(true);
            });
        });

        describe('getCurrentUser', () => {
            it('should return current user when authenticated', () => {
                authService.currentUser = testUsers.individual;
                const user = authService.getCurrentUser();
                expect(user.email).toBe(testUsers.individual.email);
                expect(user.accountType).toBe(testUsers.individual.accountType);
            });

            it('should return null when not authenticated', () => {
                authService.currentUser = null;
                expect(authService.getCurrentUser()).toBe(null);
            });
        });

        describe('getRolePermissions', () => {
            it('should return correct permissions for each role', () => {
                const individualPerms = authService.getRolePermissions('individual');
                expect(individualPerms).toContain('upload_document');
                expect(individualPerms).toContain('view_own_documents');
                expect(individualPerms).toContain('view_credits');

                const businessPerms = authService.getRolePermissions('business');
                expect(businessPerms).toContain('upload_document');
                expect(businessPerms).toContain('view_own_documents');
                expect(businessPerms).toContain('view_credits');

                const verifierPerms = authService.getRolePermissions('verifier');
                expect(verifierPerms).toContain('view_all_documents');
                expect(verifierPerms).toContain('attest_document');
                expect(verifierPerms).toContain('mint_credits');
                expect(verifierPerms).toContain('view_verifier_dashboard');
            });

            it('should return empty array for unknown roles', () => {
                const unknownPerms = authService.getRolePermissions('unknown');
                expect(unknownPerms).toEqual([]);
            });
        });
    });

    describe('RoleGuard Component Integration', () => {
        const TestContent = () => <div>Protected Content</div>;

        describe('Authentication Requirements', () => {
            it('should deny access when user is not authenticated', () => {
                authService.isAuthenticated = false;
                authService.currentUser = null;

                render(
                    <TestWrapper>
                        <RoleGuard requireAuthentication={true}>
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Please log in to access this content')).toBeInTheDocument();
                expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            });

            it('should allow access when user is authenticated', () => {
                authService.isAuthenticated = true;
                authService.currentUser = testUsers.individual;

                render(
                    <TestWrapper>
                        <RoleGuard requireAuthentication={true} user={testUsers.individual}>
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });

        describe('Role-Based Access Control', () => {
            beforeEach(() => {
                authService.isAuthenticated = true;
            });

            it('should allow access for users with correct role', () => {
                authService.currentUser = testUsers.verifier;

                render(
                    <TestWrapper>
                        <RoleGuard allowedRoles={['verifier']} user={testUsers.verifier}>
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });

            it('should deny access for users with incorrect role', () => {
                authService.currentUser = testUsers.individual;

                render(
                    <TestWrapper>
                        <RoleGuard allowedRoles={['verifier']} user={testUsers.individual}>
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Access Denied')).toBeInTheDocument();
                expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            });

            it('should allow access for users with any of multiple allowed roles', () => {
                authService.currentUser = testUsers.business;

                render(
                    <TestWrapper>
                        <RoleGuard allowedRoles={['individual', 'business']} user={testUsers.business}>
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });

        describe('Permission-Based Access Control', () => {
            beforeEach(() => {
                authService.isAuthenticated = true;
            });

            it('should allow access for users with required permissions', () => {
                authService.currentUser = testUsers.verifier;

                render(
                    <TestWrapper>
                        <RoleGuard requiredPermissions={['view_all_documents']} user={testUsers.verifier}>
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });

            it('should deny access for users without required permissions', () => {
                authService.currentUser = testUsers.individual;

                render(
                    <TestWrapper>
                        <RoleGuard requiredPermissions={['view_all_documents']} user={testUsers.individual}>
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Access Denied')).toBeInTheDocument();
                expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            });

            it('should require all permissions when multiple are specified', () => {
                authService.currentUser = testUsers.verifier;

                render(
                    <TestWrapper>
                        <RoleGuard
                            requiredPermissions={['view_all_documents', 'nonexistent_permission']}
                            user={testUsers.verifier}
                        >
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Access Denied')).toBeInTheDocument();
                expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            });
        });

        describe('Combined Role and Permission Checks', () => {
            beforeEach(() => {
                authService.isAuthenticated = true;
            });

            it('should allow access when both role and permissions match', () => {
                authService.currentUser = testUsers.verifier;

                render(
                    <TestWrapper>
                        <RoleGuard
                            allowedRoles={['verifier']}
                            requiredPermissions={['view_all_documents']}
                            user={testUsers.verifier}
                        >
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });

            it('should deny access when role matches but permissions do not', () => {
                authService.currentUser = testUsers.verifier;

                render(
                    <TestWrapper>
                        <RoleGuard
                            allowedRoles={['verifier']}
                            requiredPermissions={['upload_document']} // Verifiers don't have this permission
                            user={testUsers.verifier}
                        >
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Access Denied')).toBeInTheDocument();
                expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            });
        });

        describe('Error Handling', () => {
            it('should handle null user gracefully', () => {
                authService.isAuthenticated = false;
                authService.currentUser = null;

                render(
                    <TestWrapper>
                        <RoleGuard allowedRoles={['individual']} user={null}>
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Access Denied')).toBeInTheDocument();
            });

            it('should handle undefined roles gracefully', () => {
                authService.isAuthenticated = true;
                authService.currentUser = { email: 'test@example.com' }; // No accountType

                render(
                    <TestWrapper>
                        <RoleGuard allowedRoles={['individual']} user={authService.currentUser}>
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });

        describe('Custom Fallback Components', () => {
            it('should render custom fallback when access is denied', () => {
                authService.isAuthenticated = true;
                authService.currentUser = testUsers.individual;

                const CustomFallback = () => <div>Custom Access Denied Message</div>;

                render(
                    <TestWrapper>
                        <RoleGuard
                            allowedRoles={['verifier']}
                            user={testUsers.individual}
                            fallback={<CustomFallback />}
                        >
                            <TestContent />
                        </RoleGuard>
                    </TestWrapper>
                );

                expect(screen.getByText('Custom Access Denied Message')).toBeInTheDocument();
                expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            });
        });
    });

    describe('Role-Based User Scenarios', () => {
        describe('Individual User Workflow', () => {
            beforeEach(() => {
                authService.isAuthenticated = true;
                authService.currentUser = testUsers.individual;
            });

            it('should have correct permissions for document upload', () => {
                expect(authService.hasPermission('upload_document')).toBe(true);
                expect(authService.hasPermission('view_own_documents')).toBe(true);
                expect(authService.hasPermission('view_credits')).toBe(true);
            });

            it('should not have verifier permissions', () => {
                expect(authService.hasPermission('view_all_documents')).toBe(false);
                expect(authService.hasPermission('attest_document')).toBe(false);
                expect(authService.hasPermission('mint_credits')).toBe(false);
            });

            it('should be identified correctly by role checks', () => {
                expect(authService.getUserRole()).toBe('individual');
                expect(authService.isVerifier()).toBe(false);
            });
        });

        describe('Business User Workflow', () => {
            beforeEach(() => {
                authService.isAuthenticated = true;
                authService.currentUser = testUsers.business;
            });

            it('should have same permissions as individual users', () => {
                expect(authService.hasPermission('upload_document')).toBe(true);
                expect(authService.hasPermission('view_own_documents')).toBe(true);
                expect(authService.hasPermission('view_credits')).toBe(true);
            });

            it('should not have verifier permissions', () => {
                expect(authService.hasPermission('view_all_documents')).toBe(false);
                expect(authService.hasPermission('attest_document')).toBe(false);
                expect(authService.hasPermission('mint_credits')).toBe(false);
            });

            it('should be identified correctly by role checks', () => {
                expect(authService.getUserRole()).toBe('business');
                expect(authService.isVerifier()).toBe(false);
            });
        });

        describe('Verifier User Workflow', () => {
            beforeEach(() => {
                authService.isAuthenticated = true;
                authService.currentUser = testUsers.verifier;
            });

            it('should have verifier-specific permissions', () => {
                expect(authService.hasPermission('view_all_documents')).toBe(true);
                expect(authService.hasPermission('attest_document')).toBe(true);
                expect(authService.hasPermission('mint_credits')).toBe(true);
                expect(authService.hasPermission('view_verifier_dashboard')).toBe(true);
            });

            it('should not have upload permissions', () => {
                expect(authService.hasPermission('upload_document')).toBe(false);
                expect(authService.hasPermission('view_own_documents')).toBe(false);
            });

            it('should be identified correctly by role checks', () => {
                expect(authService.getUserRole()).toBe('verifier');
                expect(authService.isVerifier()).toBe(true);
            });
        });
    });

    describe('Security and Edge Cases', () => {
        it('should handle corrupted user data gracefully', () => {
            authService.isAuthenticated = true;
            authService.currentUser = { invalidData: true };

            expect(authService.getUserRole()).toBe('individual'); // Should default
            expect(authService.isVerifier()).toBe(false);
            expect(authService.hasPermission('upload_document')).toBe(true); // Should use default role permissions
        });

        it('should handle missing accountType gracefully', () => {
            authService.isAuthenticated = true;
            authService.currentUser = {
                email: 'test@example.com',
                name: 'Test User'
            };

            expect(authService.getUserRole()).toBe('individual');
            expect(authService.isVerifier()).toBe(false);
            expect(authService.hasPermission('upload_document')).toBe(true);
        });

        it('should handle null/undefined user data', () => {
            authService.isAuthenticated = false;
            authService.currentUser = null;

            expect(authService.getUserRole()).toBe(null);
            expect(authService.isVerifier()).toBe(false);
            expect(authService.hasPermission('upload_document')).toBe(false);
            expect(authService.getCurrentUser()).toBe(null);
        });

        it('should validate account types correctly', () => {
            const validTypes = authService.getAvailableAccountTypes();
            expect(validTypes).toContain('individual');
            expect(validTypes).toContain('business');
            expect(validTypes).toContain('verifier');

            const validation1 = authService.validateAccountType('individual');
            expect(validation1.valid).toBe(true);
            expect(validation1.accountType).toBe('individual');

            const validation2 = authService.validateAccountType('invalid');
            expect(validation2.valid).toBe(false);

            const validation3 = authService.validateAccountType(null);
            expect(validation3.valid).toBe(true);
            expect(validation3.accountType).toBe('individual'); // Default
        });
    });
});