import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GradebookControls } from '../components/gradebook/GradebookControls';

// --- Mocks ---
vi.mock('motion/react', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));
vi.mock('../components/icons', () => ({
    ChevronDownIcon: () => <span data-testid="chevron-icon" />,
    MoreHorizontalIcon: () => <span data-testid="more-horizontal-icon" />,
    MoreVerticalIcon: () => <span data-testid="more-vertical-icon" />,
    DocumentTextIcon: () => <span data-testid="doc-icon" />,
    BoltIcon: () => <span data-testid="bolt-icon" />,
    PencilIcon: () => <span data-testid="pencil-icon" />,
    ChartBarIcon: () => <span data-testid="chart-bar-icon" />,
    XIcon: () => <span data-testid="x-icon" />,
    UserGroupIcon: () => <span data-testid="users-icon" />,
}));

const defaultProps = {
    gradeViewType: 'summary' as const,
    setGradeViewType: vi.fn(),
    selectedPeriod: 'P1' as any,
    setSelectedPeriod: vi.fn(),
    evaluationPeriods: ['P1', 'P2', 'P3', 'P4'] as any[],
    periodCompetencyFilter: 'all',
    setPeriodCompetencyFilter: vi.fn(),
    competencyGroups: ['G1', 'G2', 'G3', 'G4'] as any[],
    groupNames: { G1: 'Grupo 1', G2: 'Grupo 2', G3: 'Grupo 3', G4: 'Grupo 4' } as any,
    fundamentalCompetencies: [],
    showRecoveryGrades: false,
    setShowRecoveryGrades: vi.fn(),
    setIsInstrumentsModalOpen: vi.fn(),
    setIsCompetenciesModalOpen: vi.fn(),
    studentFilter: null,
    students: [],
    onClearStudentFilter: vi.fn(),
    setExpandedStudentId: vi.fn(),
    mobileColumnView: 'averages' as const,
    setMobileColumnView: vi.fn(),
    showStatusFilters: false,
    setShowStatusFilters: vi.fn(),
    statusFilter: null,
    setStatusFilter: vi.fn(),
    teams: [
        { id: 't1', name: 'Equipo 1', classId: 'c1', studentIds: [] },
        { id: 't2', name: 'Equipo 2', classId: 'c1', studentIds: [] },
    ],
    teamFilter: null,
    setTeamFilter: vi.fn(),
};

describe('GradebookControls Component', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders unified filter select with optgroups for teams and statuses', () => {
        // Needs period view for filters to show up
        render(<GradebookControls {...defaultProps} gradeViewType="period" />);

        // Check if the options are present
        expect(screen.getByText('Todos los estudiantes')).toBeInTheDocument();
        
        // Options
        expect(screen.getByText('Equipo 1')).toBeInTheDocument();
        expect(screen.getByText('En recuperación')).toBeInTheDocument();
        expect(screen.getByText('Meritorios')).toBeInTheDocument();
        expect(screen.getByText('Nota vacía')).toBeInTheDocument();
    });

    it('invokes setTeamFilter when a team is selected', () => {
        render(<GradebookControls {...defaultProps} gradeViewType="period" />);
        
        // Find select by seeing which one has the options
        // It's tricky with multiple selects, we can look for the select that has the option value `team_t1`
        const selects = screen.getAllByRole('combobox');
        // The second or third select is the filter
        const filterSelect = selects.find(s => s.querySelector('option[value="team_t1"]')) as HTMLSelectElement;
        
        fireEvent.change(filterSelect, { target: { value: 'team_t1' } });

        expect(defaultProps.setTeamFilter).toHaveBeenCalledWith('t1');
        expect(defaultProps.setStatusFilter).toHaveBeenCalledWith(null);
    });

    it('invokes setStatusFilter when a status is selected', () => {
        render(<GradebookControls {...defaultProps} gradeViewType="period" />);
        
        const selects = screen.getAllByRole('combobox');
        const filterSelect = selects.find(s => s.querySelector('option[value="status_recovery"]')) as HTMLSelectElement;
        
        fireEvent.change(filterSelect, { target: { value: 'status_recovery' } });

        expect(defaultProps.setStatusFilter).toHaveBeenCalledWith('recovery');
        expect(defaultProps.setTeamFilter).toHaveBeenCalledWith(null);
    });

    it('clears both filters when empty option is selected', () => {
        render(<GradebookControls {...defaultProps} gradeViewType="period" teamFilter="t1" />);
        
        const selects = screen.getAllByRole('combobox');
        const filterSelect = selects.find(s => s.querySelector('option[value=""]')) as HTMLSelectElement;
        
        fireEvent.change(filterSelect, { target: { value: '' } });

        expect(defaultProps.setTeamFilter).toHaveBeenCalledWith(null);
        expect(defaultProps.setStatusFilter).toHaveBeenCalledWith(null);
    });

    it('renders clear pills for active filters', () => {
        // Test with teamFilter
        const { rerender } = render(<GradebookControls {...defaultProps} gradeViewType="period" teamFilter="t1" />);
        
        const teamPill = screen.getByTitle('Eliminar filtro de equipo');
        expect(teamPill).toBeInTheDocument();
        fireEvent.click(teamPill);
        expect(defaultProps.setTeamFilter).toHaveBeenCalledWith(null);

        // Test with statusFilter
        rerender(<GradebookControls {...defaultProps} gradeViewType="period" statusFilter="merit" />);
        
        const statusPill = screen.getByTitle('Eliminar filtro de condición');
        expect(statusPill).toBeInTheDocument();
        fireEvent.click(statusPill);
        expect(defaultProps.setStatusFilter).toHaveBeenCalledWith(null);
    });
});
