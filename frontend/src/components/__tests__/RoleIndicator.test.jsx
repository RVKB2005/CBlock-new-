import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RoleIndicator, { RoleBadge, RoleWelcomeMessage } from '../RoleIndicator.jsx';

// Mock the permissions utility
vi.mock('../../utils/permissions.js', () => ({
    getRoleDisplayName: vi.fn((role) => {
        const names = {
            individual: 'Individual User',
            business: 'Business User',
            verifier: 'Verifier'
        };
        return names[role] || role;
    }),
    getCurrentUserRole: vi.fn((user) => user?.accountType || 'individual'),
    getCurrentUserPermissions: vi.fn(() => ['upload_document', 'view_credits'])
}));

describe('RoleIndicator Component', () => {
    const mockUser = {
        accountType: 'individual',
        name: 'Test User',
        email: 'test@example.com'
    };

    it('renders role indicator in compact mode', () => {
        render(<RoleIndicator user={mockUser} compact={true} />);

        expect(screen.getByText('Individual User')).toBeInTheDocument();
    });

    it('renders role indicator in full mode', () => {
        render(<RoleIndicator user={mockUser} compact={false} />);

        expect(screen.getByText('Current Role')).toBeInTheDocument();
        expect(screen.getByText('Individual User')).toBeInTheDocument();
    });

    it('shows permissions when requested', () => {
        render(<RoleIndicator user={mockUser} showPermissions={true} />);

        expect(screen.getByText('Permissions:')).toBeInTheDocument();
    });

    it('applies correct styling for different roles', () => {
        const verifierUser = { ...mockUser, accountType: 'verifier' };
        render(<RoleIndicator user={verifierUser} compact={true} />);

        const indicator = screen.getByText('Verifier').closest('div');
        expect(indicator).toHaveClass('text-green-600');
    });
});

describe('RoleBadge Component', () => {
    it('renders as compact role indicator', () => {
        const mockUser = { accountType: 'business' };
        render(<RoleBadge user={mockUser} />);

        expect(screen.getByText('Business User')).toBeInTheDocument();
    });
});

describe('RoleWelcomeMessage Component', () => {
    const mockOnNavigate = vi.fn();

    beforeEach(() => {
        mockOnNavigate.mockClear();
    });

    it('renders welcome message for individual user', () => {
        const mockUser = { accountType: 'individual' };
        render(<RoleWelcomeMessage user={mockUser} onNavigate={mockOnNavigate} />);

        expect(screen.getByText('Welcome to CBlock')).toBeInTheDocument();
        expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    });

    it('renders welcome message for business user', () => {
        const mockUser = { accountType: 'business' };
        render(<RoleWelcomeMessage user={mockUser} onNavigate={mockOnNavigate} />);

        expect(screen.getByText('Welcome to CBlock Business')).toBeInTheDocument();
    });

    it('renders welcome message for verifier', () => {
        const mockUser = { accountType: 'verifier' };
        render(<RoleWelcomeMessage user={mockUser} onNavigate={mockOnNavigate} />);

        expect(screen.getByText('Welcome to your Verifier Dashboard')).toBeInTheDocument();
        expect(screen.getByText('View Documents')).toBeInTheDocument();
    });

    it('handles navigation when button is clicked', () => {
        const mockUser = { accountType: 'individual' };
        render(<RoleWelcomeMessage user={mockUser} onNavigate={mockOnNavigate} />);

        const button = screen.getByText('Upload Documents');
        button.click();

        expect(mockOnNavigate).toHaveBeenCalledWith('mintCredits');
    });
});