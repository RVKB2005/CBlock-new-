import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Breadcrumb, { useBreadcrumb } from '../Breadcrumb.jsx';

describe('Breadcrumb Component', () => {
    const mockOnNavigate = vi.fn();

    beforeEach(() => {
        mockOnNavigate.mockClear();
    });

    it('renders nothing when no items provided', () => {
        const { container } = render(<Breadcrumb items={[]} onNavigate={mockOnNavigate} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders breadcrumb items correctly', () => {
        const items = [
            { label: 'Dashboard', href: 'dashboard', icon: 'home' },
            { label: 'Verifier Dashboard', href: 'verifierDashboard' },
            { label: 'Current Page' }
        ];

        render(<Breadcrumb items={items} onNavigate={mockOnNavigate} />);

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Verifier Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Current Page')).toBeInTheDocument();
    });

    it('handles navigation clicks correctly', () => {
        const items = [
            { label: 'Dashboard', href: 'dashboard' },
            { label: 'Current Page' }
        ];

        render(<Breadcrumb items={items} onNavigate={mockOnNavigate} />);

        const dashboardLink = screen.getByText('Dashboard');
        fireEvent.click(dashboardLink);

        expect(mockOnNavigate).toHaveBeenCalledWith('dashboard');
    });

    it('does not make last item clickable', () => {
        const items = [
            { label: 'Dashboard', href: 'dashboard' },
            { label: 'Current Page' }
        ];

        render(<Breadcrumb items={items} onNavigate={mockOnNavigate} />);

        const currentPageText = screen.getByText('Current Page');
        expect(currentPageText.tagName).toBe('SPAN');
    });
});

describe('useBreadcrumb Hook', () => {
    const TestComponent = ({ currentPage, userRole }) => {
        const breadcrumbItems = useBreadcrumb(currentPage, userRole);
        return (
            <div>
                {breadcrumbItems.map((item, index) => (
                    <span key={index} data-testid={`breadcrumb-${index}`}>
                        {item.label}
                    </span>
                ))}
            </div>
        );
    };

    it('generates correct breadcrumb for dashboard', () => {
        render(<TestComponent currentPage="dashboard" userRole="individual" />);
        expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('Dashboard');
    });

    it('generates correct breadcrumb for verifier dashboard', () => {
        render(<TestComponent currentPage="verifierDashboard" userRole="verifier" />);

        expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('Dashboard');
        expect(screen.getByTestId('breadcrumb-1')).toHaveTextContent('Verifier Dashboard');
    });

    it('generates correct breadcrumb for upload documents', () => {
        render(<TestComponent currentPage="mintCredits" userRole="individual" />);

        expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('Dashboard');
        expect(screen.getByTestId('breadcrumb-1')).toHaveTextContent('Upload Documents');
    });

    it('generates different breadcrumb for verifier accessing upload', () => {
        render(<TestComponent currentPage="mintCredits" userRole="verifier" />);

        expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('Dashboard');
        expect(screen.getByTestId('breadcrumb-1')).toHaveTextContent('Verifier Dashboard');
        expect(screen.getByTestId('breadcrumb-2')).toHaveTextContent('Upload Documents');
    });
});