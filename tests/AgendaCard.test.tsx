import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgendaCard } from '../components/AgendaCard';
import { CustomEvent, EvaluationInstrument, Class } from '../types';

describe('AgendaCard', () => {
    const mockClasses: Class[] = [
        { id: 'c1', name: 'Math' } as any
    ];

    const mockCustomEvents: CustomEvent[] = [
        { id: '1', title: 'Test Event', date: '2099-01-01', description: 'Test', color: '#ff0000' },
        { id: '2', title: 'Past Event', date: '2000-01-01', description: 'Past', color: '#00ff00' }
    ];

    const mockInstruments: EvaluationInstrument[] = [
        { id: '3', name: 'Test Instrument', date: '2099-01-02', type: 'rubric', classId: 'c1' } as any
    ];

    it('renders upcoming events and instruments', () => {
        render(
            <AgendaCard
                customEvents={mockCustomEvents}
                instruments={mockInstruments}
                classes={mockClasses}
                onNavigateToCalendar={vi.fn()}
            />
        );

        // Should show future event
        expect(screen.getByText('Test Event')).toBeInTheDocument();

        // Should show future instrument
        expect(screen.getByText('Test Instrument')).toBeInTheDocument();

        // Should NOT show past event
        expect(screen.queryByText('Past Event')).not.toBeInTheDocument();
    });

    it('shows empty state when no upcoming items', () => {
        render(
            <AgendaCard
                customEvents={[]}
                instruments={[]}
                classes={mockClasses}
                onNavigateToCalendar={vi.fn()}
            />
        );

        expect(screen.getByText('No hay eventos próximos')).toBeInTheDocument();
    });
});
