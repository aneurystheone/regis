import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ExpressGradingModal } from '../components/ExpressGradingModal';
import { Student, Class, EvaluationInstrument, Grade, WorkTeam } from '../types';
import { api } from '../services/api';

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

vi.mock('../components/icons', async (importOriginal) => {
    const actual: any = await importOriginal();
    const mockedIcons: Record<string, any> = {};
    Object.keys(actual).forEach(key => {
        mockedIcons[key] = (props: any) => <span data-testid={key.toLowerCase()} {...props} />;
    });
    return mockedIcons;
});

vi.mock('../components/Avatar', () => ({
    Avatar: () => <div data-testid="avatar" />,
}));

vi.mock('../services/api', () => ({
    api: {
        subscribeToTeams: vi.fn(() => () => {}),
        saveGrade: vi.fn().mockResolvedValue({}),
    },
    getCurrentUserId: vi.fn(() => 'test-user'),
    isVirtualMode: vi.fn(() => false),
}));

vi.mock('../utils', () => ({
    sortStudents: vi.fn((s) => s),
    filterStudentsByClass: vi.fn((s, id) => s.filter((st: any) => st.classId === id)),
}));

// --- Test Data ---

const mockStudents: Student[] = [
    { id: 's1', name: 'Student One', classId: 'c1', gender: 'M', avatar: '' },
    { id: 's2', name: 'Student Two', classId: 'c1', gender: 'F', avatar: '' },
    { id: 's3', name: 'Student Three', classId: 'c1', gender: 'M', avatar: '' },
];

const mockClasses: Class[] = [
    { id: 'c1', name: '6to A', grade: '6to', section: 'A', schoolYear: '2023-2024', color: 'blue', level: 'Secundario', schedule: 'Lun-Mie' },
];

const mockInstrumentNormal: EvaluationInstrument = {
    id: 'inst1', name: 'Examen P1', date: '2023-10-10', type: 'Examen', classId: 'c1', competencyIds: ['comp1'], period: 'P1', totalPoints: 100
};

const mockInstrumentProject: EvaluationInstrument = {
    id: 'inst2', name: 'Proyecto Final', date: '2023-10-15', type: 'Proyecto', classId: 'c1', competencyIds: ['comp1'], period: 'P1', totalPoints: 100
};

const mockGrades: Grade[] = [];

const mockTeams: WorkTeam[] = [
    { id: 'team1', name: 'Equipo Alfa', classId: 'c1', studentIds: ['s1', 's2'] }
];

describe('ExpressGradingModal Component', () => {
    let onGradeUpdatedMock: any;
    let onCloseMock: any;

    beforeEach(() => {
        onGradeUpdatedMock = vi.fn();
        onCloseMock = vi.fn();
        vi.clearAllMocks();
    });

    it('renders in individual mode by default for normal instruments', () => {
        render(
            <ExpressGradingModal
                isOpen={true}
                onClose={onCloseMock}
                instrument={mockInstrumentNormal}
                students={mockStudents}
                grades={mockGrades}
                classes={mockClasses}
                onGradeUpdated={onGradeUpdatedMock}
            />
        );

        // Check title
        expect(screen.getByText(/Examen P1/i)).toBeInTheDocument();
        
        // Individual rows should be rendered
        expect(screen.getByText('Student One')).toBeInTheDocument();
        expect(screen.getByText('Student Two')).toBeInTheDocument();
        expect(screen.getByText('Student Three')).toBeInTheDocument();

        // Team names shouldn't be rendered
        expect(screen.queryByText('Equipo Alfa')).not.toBeInTheDocument();
    });

    it('auto-selects team mode for project instruments', () => {
        render(
            <ExpressGradingModal
                isOpen={true}
                onClose={onCloseMock}
                instrument={mockInstrumentProject}
                students={mockStudents}
                grades={mockGrades}
                classes={mockClasses}
                onGradeUpdated={onGradeUpdatedMock}
                teams={mockTeams}
            />
        );

        // Team should be rendered
        expect(screen.getByText('Equipo Alfa')).toBeInTheDocument();
        
        // s3 is not in a team
        expect(screen.getByText('Sin Equipo')).toBeInTheDocument();
        expect(screen.getByText('Student Three')).toBeInTheDocument();
    });

    it('fetches teams from API if not provided in props', async () => {
        (api.subscribeToTeams as any).mockImplementation((callback: any) => {
            callback(mockTeams);
            return () => {};
        });

        render(
            <ExpressGradingModal
                isOpen={true}
                onClose={onCloseMock}
                instrument={mockInstrumentProject}
                students={mockStudents}
                grades={mockGrades}
                classes={mockClasses}
                onGradeUpdated={onGradeUpdatedMock}
                // no teams prop
            />
        );

        expect(api.subscribeToTeams).toHaveBeenCalled();
        await waitFor(() => {
            expect(screen.getByText('Equipo Alfa')).toBeInTheDocument();
        });
    });

    it('propagates scores to all team members', async () => {
        render(
            <ExpressGradingModal
                isOpen={true}
                onClose={onCloseMock}
                instrument={mockInstrumentProject}
                students={mockStudents}
                grades={mockGrades}
                classes={mockClasses}
                onGradeUpdated={onGradeUpdatedMock}
                teams={mockTeams}
            />
        );

        // Get the score input for the team (first numeric input usually represents the team score if it's the first row)
        // Let's find by placeholder "-"
        const inputs = screen.getAllByPlaceholderText('-');
        // The first input should be the team input
        const teamInput = inputs[0];

        fireEvent.change(teamInput, { target: { value: '85' } });

        // performSave is async and debounced by 1.5s, wait for it to complete
        await waitFor(() => {
            expect(onGradeUpdatedMock).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's1', score: 85 }));
            expect(onGradeUpdatedMock).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's2', score: 85 }));
        }, { timeout: 3000 });
    });

});
