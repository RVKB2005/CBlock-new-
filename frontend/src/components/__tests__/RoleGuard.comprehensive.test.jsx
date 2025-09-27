import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RoleGuard from '../RoleGuard.jsx';
import authService from '../../services/auth.js';

// Mock the auth service
vi.mock('../../services/auth.js', () => ({
    default: {
        getCurrentUser: vi.fn(),
        isUserAuthenticated: vi.fn(),
        hasPermission: vi.fn(),
        getRolePermissions: vi.fn()
    }
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        button: ({ children, ...props }) => <button {...props}>{children}</button>
    }
}));

describe('RoleGuard Comprehensive Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const TestContent = () => <div>Protected Content</div>;

    describe('Complex Role Scenarios', () => {
        it('should handle nested role guards correctly', () => {
            const individualUser = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(individualUser);

            render(
                <RoleGuard allowedRoles={['individual', 'business']} user={individualUser}>
                    <RoleGuard allowedRoles={['individual']} user={individualUser}>
                        <TestContent />
                    </RoleGuard>
                </RoleGuard>
            );

            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('should deny access in nested guards when inner guard fails', () => {
            const businessUser = { accountType: 'business', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(businessUser);

            render(
                <RoleGuard allowedRoles={['individual', 'business']} user={businessUser}>
                    <RoleGuard allowedRoles={['individual']} user={businessUser}>
                        <TestContent />
                    </RoleGuard>
                </RoleGuard>
            );

            expect(screen.getByText('Access Denied')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });

        it('should handle role changes during component lifecycle', async () => {
            let currentUser = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(currentUser);

            const { rerender } = render(
                <RoleGuard allowedRoles={['verifier']} user={currentUser}>
                    <TestContent />
                </RoleGuard>
            );

            // Initially should be denied
            expect(screen.getByText('Access Denied')).toBeInTheDocument();

            // Change user role
            currentUser = { accountType: 'verifier', email: 'test@example.com' };
            authService.getCurrentUser.mockReturnValue(currentUser);

            rerender(
                <RoleGuard allowedRoles={['verifier']} user={currentUser}>
                    <TestContent />
                </RoleGuard>
            );

            // Should now have access
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });
    });

    describe('Permission-Based Access Control Edge Cases', () => {
        it('should handle empty permission arrays', () => {
            const user = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);

            render(
                <RoleGuard requiredPermissions={[]} user={user}>
                    <TestContent />
                </RoleGuard>
            );

            // Empty permissions should allow access
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('should handle undefined permissions gracefully', () => {
            const user = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);
            authService.hasPermission.mockReturnValue(undefined);

            render(
                <RoleGuard requiredPermissions={['upload_document']} user={user}>
                    <TestContent />
                </RoleGuard>
            );

            // Undefined permission should deny access
            expect(screen.getByText('Access Denied')).toBeInTheDocument();
        });

        it('should handle permission checking errors', () => {
            const user = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);
            authService.hasPermission.mockImplementation(() => {
                throw new Error('Permission check failed');
            });

            render(
                <RoleGuard requiredPermissions={['upload_document']} user={user}>
                    <TestContent />
                </RoleGuard>
            );

            // Error in permission check should deny access
            expect(screen.getByText('Access Denied')).toBeInTheDocument();
        });

        it('should handle complex permission combinations', () => {
            const user = { accountType: 'verifier', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);
            authService.hasPermission.mockImplementation((permission) => {
                const permissions = {
                    'view_all_documents': true,
                    'attest_document': true,
                    'mint_credits': false, // This one fails
                    'admin_access': false
                };
                return permissions[permission] || false;
            });

            render(
                <RoleGuard
                    requiredPermissions={['view_all_documents', 'attest_document', 'mint_credits']}
                    user={user}
                >
                    <TestContent />
                </RoleGuard>
            );

            // Should fail because mint_credits is false
            expect(screen.getByText('Access Denied')).toBeInTheDocument();
        });
    });

    describe('Authentication State Management', () => {
        it('should handle authentication state changes', async () => {
            const user = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(false);
            authService.getCurrentUser.mockReturnValue(null);

            const { rerender } = render(
                <RoleGuard requireAuthentication={true} user={user}>
                    <TestContent />
                </RoleGuard>
            );

            // Initially not authenticated
            expect(screen.getByText('Please log in to access this content')).toBeInTheDocument();

            // User logs in
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);

            rerender(
                <RoleGuard requireAuthentication={true} user={user}>
                    <TestContent />
                </RoleGuard>
            );

            // Should now have access
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('should handle user logout during session', () => {
            const user = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);

            const { rerender } = render(
                <RoleGuard requireAuthentication={true} user={user}>
                    <TestContent />
                </RoleGuard>
            );

            // Initially authenticated
            expect(screen.getByText('Protected Content')).toBeInTheDocument();

            // User logs out
            authService.isUserAuthenticated.mockReturnValue(false);
            authService.getCurrentUser.mockReturnValue(null);

            rerender(
                <RoleGuard requireAuthentication={true} user={null}>
                    <TestContent />
                </RoleGuard>
            );

            // Should now be denied
            expect(screen.getByText('Please log in to access this content')).toBeInTheDocument();
        });

        it('should handle inconsistent auth state', () => {
            // Scenario: isUserAuthenticated returns true but getCurrentUser returns null
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(null);

            render(
                <RoleGuard requireAuthentication={true} allowedRoles={['individual']}>
                    <TestContent />
                </RoleGuard>
            );

            // Should handle gracefully and deny access
            expect(screen.getByText('Access Denied')).toBeInTheDocument();
        });
    });

    describe('Custom Fallback Components', () => {
        it('should render custom fallback for authentication failure', () => {
            authService.isUserAuthenticated.mockReturnValue(false);
            authService.getCurrentUser.mockReturnValue(null);

            const CustomAuthFallback = () => <div>Please sign in to continue</div>;

            render(
                <RoleGuard
                    requireAuthentication={true}
                    fallback={<CustomAuthFallback />}
                >
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Please sign in to continue')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });

        it('should render custom fallback for role failure', () => {
            const user = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);

            const CustomRoleFallback = () => (
                <div>
                    <h2>Insufficient Privileges</h2>
                    <p>Contact administrator for access</p>
                </div>
            );

            render(
                <RoleGuard
                    allowedRoles={['verifier']}
                    user={user}
                    fallback={<CustomRoleFallback />}
                >
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Insufficient Privileges')).toBeInTheDocument();
            expect(screen.getByText('Contact administrator for access')).toBeInTheDocument();
        });

        it('should render custom fallback for permission failure', () => {
            const user = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);
            authService.hasPermission.mockReturnValue(false);

            const CustomPermissionFallback = () => (
                <div>Feature not available for your account type</div>
            );

            render(
                <RoleGuard
                    requiredPermissions={['admin_access']}
                    user={user}
                    fallback={<CustomPermissionFallback />}
                >
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Feature not available for your account type')).toBeInTheDocument();
        });

        it('should handle fallback component errors gracefully', () => {
            const user = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);

            const ErrorFallback = () => {
                throw new Error('Fallback component error');
            };

            // Should not crash the application
            expect(() => {
                render(
                    <RoleGuard
                        allowedRoles={['verifier']}
                        user={user}
                        fallback={<ErrorFallback />}
                    >
                        <TestContent />
                    </RoleGuard>
                );
            }).not.toThrow();
        });
    });

    describe('Performance and Optimization', () => {
        it('should not re-render unnecessarily when props do not change', () => {
            const user = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);

            let renderCount = 0;
            const TestContentWithCounter = () => {
                renderCount++;
                return <div>Protected Content - Render {renderCount}</div>;
            };

            const { rerender } = render(
                <RoleGuard allowedRoles={['individual']} user={user}>
                    <TestContentWithCounter />
                </RoleGuard>
            );

            expect(screen.getByText('Protected Content - Render 1')).toBeInTheDocument();

            // Re-render with same props
            rerender(
                <RoleGuard allowedRoles={['individual']} user={user}>
                    <TestContentWithCounter />
                </RoleGuard>
            );

            // Should not cause unnecessary re-renders of children
            expect(screen.getByText('Protected Content - Render 2')).toBeInTheDocument();
        });

        it('should handle rapid permission checks efficiently', () => {
            const user = { accountType: 'verifier', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);

            let permissionCheckCount = 0;
            authService.hasPermission.mockImplementation(() => {
                permissionCheckCount++;
                return true;
            });

            render(
                <RoleGuard
                    requiredPermissions={['view_all_documents', 'attest_document']}
                    user={user}
                >
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Protected Content')).toBeInTheDocument();
            expect(permissionCheckCount).toBe(2); // Should check each permission once
        });
    });

    describe('Accessibility and User Experience', () => {
        it('should provide accessible error messages', () => {
            const user = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);

            render(
                <RoleGuard allowedRoles={['verifier']} user={user}>
                    <TestContent />
                </RoleGuard>
            );

            const accessDeniedElement = screen.getByText('Access Denied');
            expect(accessDeniedElement).toBeInTheDocument();

            // Should have appropriate ARIA attributes
            expect(accessDeniedElement.closest('[role="alert"]')).toBeInTheDocument();
        });

        it('should provide helpful context in error messages', () => {
            authService.isUserAuthenticated.mockReturnValue(false);
            authService.getCurrentUser.mockReturnValue(null);

            render(
                <RoleGuard requireAuthentication={true}>
                    <TestContent />
                </RoleGuard>
            );

            expect(screen.getByText('Please log in to access this content')).toBeInTheDocument();
        });

        it('should handle loading states gracefully', async () => {
            const user = { accountType: 'individual', email: 'test@example.com' };
            authService.isUserAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue(user);

            // Simulate slow permission check
            authService.hasPermission.mockImplementation(() => {
                return new Promise(resolve => setTimeout(() => resolve(true), 100));
            });

            render(
                <RoleGuard requiredPermissions={['upload_document']} user={user}>
                    <TestContent />
                </RoleGuard>
            );

            // Should eventually show content
            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });
    });

    describe('Integration with Different User Types', () => {
        const testUsers = {
            individual: {
                accountType: 'individual',
                email: 'individual@example.com',
                firstName: 'John',
                lastName: 'Doe'
            },
            business: {
                accountType: 'business',
                email: 'business@example.com',
                organization: 'Green Corp',
                firstName: 'Jane',
                lastName: 'Smith'
            },
            verifier: {
                accountType: 'verifier',
                email: 'verifier@example.com',
                firstName: 'Dr. Alice',
                lastName: 'Johnson',
                verifierCredentials: {
                    certificationId: 'CERT-12345'
                }
            }
        };

        Object.entries(testUsers).forEach(([userType, userData]) => {
            it(`should handle ${userType} user access correctly`, () => {
                authService.isUserAuthenticated.mockReturnValue(true);
                authService.getCurrentUser.mockReturnValue(userData);

                render(
                    <RoleGuard allowedRoles={[userType]} user={userData}>
                        <TestContent />
                    </RoleGuard>
                );

                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });

            it(`should deny ${userType} user access to other roles`, () => {
                const otherRoles = Object.keys(testUsers).filter(role => role !== userType);

                authService.isUserAuthenticated.mockReturnValue(true);
                authService.getCurrentUser.mockReturnValue(userData);

                render(
                    <RoleGuard allowedRoles={otherRoles} user={userData}>
                        <TestContent />
                    </RoleGuard>
                );

                expect(screen.getByText('Access Denied')).toBeInTheDocument();
            });
        });
    });
});