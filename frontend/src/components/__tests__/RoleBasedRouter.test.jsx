import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RoleBasedRouter, { useRoleBasedRouting } from '../RoleBasedRouter.jsx';

// Mock the role-based navigation hook
vi.mock('../../hooks/useRoleBasedNavigation.js', () => ({
    useRoleBasedNavigation: vi.fn(() => ({
        checkPageAccess: vi.fn(() => true),
        handleRoleBasedRedirect: vi.fn(() => false),
        getLandingPage: vi.fn(() => 'dashboard'),
        userRole: 'individual'
    }))
}));

// Mock the components
vi.mock('../RoleLandingPage.jsx', () => ({
    default: ({ user, onNavigate }) => (
        <div data-testid="role-landing-page">
            Landing Page for {user?.accountType}
        </div>
    )
}));

vi.mock('../AccessDenied.jsx', () => ({
    default: ({ userRole, attemptedPage, isRedirecting }) => (
        <div data-testid="access-denied">
            Access Denied: {userRole} trying to access {attemptedPage}
            {isRedirecting && <span data-testid="redirecting">Redirecting...</span>}
        </div>
    )
}));

describe('RoleBasedRouter Component', () => {
    const mockUser = { accountType: 'individual' };
    const mockOnPageChange = vi.fn();

    beforeEach(() => {
        mockOnPageChange.mockClear();
    });

    it('renders children when user has access', () => {
        render(
            <RoleBasedRouter
                user={mockUser}
                currentPage="dashboard"
                onPageChange={mockOnPageChange}
            >
                <div data-testid="page-content">Dashboard Content</div>
            </RoleBasedRouter>
        );

        expect(screen.getByTestId('page-content')).toBeInTheDocument();
    });

    it('shows landing page when requested', () => {
        render(
            <RoleBasedRouter
                user={mockUser}
                currentPage="dashboard"
                onPageChange={mockOnPageChange}
                showLandingPage={true}
            >
                <div>Should not show</div>
            </RoleBasedRouter>
        );

        expect(screen.getByTestId('role-landing-page')).toBeInTheDocument();
        expect(screen.queryByText('Should not show')).not.toBeInTheDocument();
    });
});

describe('useRoleBasedRouting Hook', () => {
    const mockUser = { accountType: 'individual' };

    const TestComponent = ({ user, initialPage }) => {
        const {
            currentPage,
            navigationHistory,
            navigateToPage,
            goBack,
            canGoBack
        } = useRoleBasedRouting(user, initialPage);

        return (
            <div>
                <div data-testid="current-page">{currentPage}</div>
                <div data-testid="can-go-back">{canGoBack.toString()}</div>
                <button onClick={() => navigateToPage('tokens')}>Navigate to Tokens</button>
                <button onClick={goBack}>Go Back</button>
            </div>
        );
    };

    it('initializes with correct page', () => {
        render(<TestComponent user={mockUser} initialPage="portfolio" />);

        expect(screen.getByTestId('current-page')).toHaveTextContent('portfolio');
    });

    it('renders navigation controls', () => {
        render(<TestComponent user={mockUser} initialPage="dashboard" />);

        expect(screen.getByText('Navigate to Tokens')).toBeInTheDocument();
        expect(screen.getByText('Go Back')).toBeInTheDocument();
    });

    it('shows correct initial state', () => {
        render(<TestComponent user={mockUser} initialPage="dashboard" />);

        // Initially can't go back
        expect(screen.getByTestId('can-go-back')).toHaveTextContent('false');
    });
});