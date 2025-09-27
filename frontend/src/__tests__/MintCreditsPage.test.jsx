import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MintCreditsPage, { DemoCreditsProvider } from '../MintCreditsPage.jsx';
import authService from '../services/auth.js';
import { ROLES } from '../utils/permissions.js';

// Mock the auth service
vi.mock('../services/auth.js', () => ({
    default: {
        getCurrentUser: vi.fn(),
        isUserAuthenticated: vi.fn(() => true),
        hasPermission: vi.fn(() => true),
        getRolePermissions: vi.fn(() => [])
    }
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

const MockedMintCreditsPage = ({ user, onNavigate = vi.fn() }) => {
    authService.getCurrentUser.mockReturnValue(user);

    return (
        <DemoCreditsProvider>
            <MintCreditsPage onNavigate={onNavigate} />
        </DemoCreditsProvider>
    );
};

describe('MintCreditsPage Role-Based Functionality', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows document upload interface for Individual users', async () => {
        const individualUser = {
            email: 'individual@test.com',
            accountType: ROLES.INDIVIDUAL
        };

        render(<MockedMintCreditsPage user={individualUser} />);

        expect(screen.getByText('Submit Project Documents')).toBeInTheDocument();
        expect(screen.getByText(/Submit your environmental impact project documentation/)).toBeInTheDocument();
        expect(screen.getByText('Upload Document')).toBeInTheDocument();
    });

    it('shows document upload interface for Business users', async () => {
        const businessUser = {
            email: 'business@test.com',
            accountType: ROLES.BUSINESS
        };

        render(<MockedMintCreditsPage user={businessUser} />);

        expect(screen.getByText('Submit Project Documents')).toBeInTheDocument();
        expect(screen.getByText(/Submit your environmental impact project documentation/)).toBeInTheDocument();
        expect(screen.getByText('Upload Document')).toBeInTheDocument();
    });

    it('redirects Verifiers to dashboard and shows appropriate message', async () => {
        const verifierUser = {
            email: 'verifier@test.com',
            accountType: ROLES.VERIFIER
        };

        const mockNavigate = vi.fn();
        render(<MockedMintCreditsPage user={verifierUser} onNavigate={mockNavigate} />);

        expect(screen.getByText('Verifier Dashboard Access')).toBeInTheDocument();
        expect(screen.getAllByText(/As a verifier, you have access to the Verifier Dashboard/).length).toBeGreaterThan(0);

        // Wait for redirect
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('verifierDashboard');
        }, { timeout: 3000 });
    });

    it('shows role-specific information banner for non-verifiers', () => {
        const individualUser = {
            email: 'individual@test.com',
            accountType: ROLES.INDIVIDUAL
        };

        render(<MockedMintCreditsPage user={individualUser} />);

        expect(screen.getByText(/Document Upload for Individual User/)).toBeInTheDocument();
        expect(screen.getByText(/What you can do: Upload project documents/)).toBeInTheDocument();
        expect(screen.getByText(/What requires verification: Document attestation/)).toBeInTheDocument();
    });

    it('shows verifier redirect message for verifiers', () => {
        const verifierUser = {
            email: 'verifier@test.com',
            accountType: ROLES.VERIFIER
        };

        render(<MockedMintCreditsPage user={verifierUser} />);

        expect(screen.getByText('Verifier Access Detected')).toBeInTheDocument();
        expect(screen.getByText(/Redirecting you to the Verifier Dashboard/)).toBeInTheDocument();
    });

    it('shows appropriate stats for different user roles', () => {
        const individualUser = {
            email: 'individual@test.com',
            accountType: ROLES.INDIVIDUAL
        };

        render(<MockedMintCreditsPage user={individualUser} />);

        expect(screen.getByText('Documents Submitted')).toBeInTheDocument();
        expect(screen.getByText('Active Projects')).toBeInTheDocument();
    });
});