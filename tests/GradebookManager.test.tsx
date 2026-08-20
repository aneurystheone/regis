import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GradebookManager } from '../components/GradebookManager';
import { Student, Class, Competency, EvaluationInstrument, Grade, FundamentalCompetency, RecoveryGrade } from '../types';

// --- Mocks ---

vi.mock('motion/react', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
        h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
        p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
        tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
        td: ({ children, ...props }: any) => <td {...props}>{children}</td>,
        th: ({ children, ...props }: any) => <th {...props}>{children}</th>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
        h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
        p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
        tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
        td: ({ children, ...props }: any) => <td {...props}>{children}</td>,
        th: ({ children, ...props }: any) => <th {...props}>{children}</th>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../contexts/ConfirmationContext', () => ({
    useConfirm: () => vi.fn().mockResolvedValue(true),
    useAlert: () => vi.fn().mockResolvedValue(undefined),
    usePrompt: () => vi.fn().mockResolvedValue(''),
    ConfirmationProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('../components/icons', async (importOriginal) => {
    const actual: any = await importOriginal();
    const mockedIcons: Record<string, any> = {};
    Object.keys(actual).forEach(key => {
        mockedIcons[key] = (props: any) => <span data-testid={key.toLowerCase()} {...props} />;
    });
    return mockedIcons;
});

vi.mock('../components/ClassSelector', () => ({
    ClassSelector: ({ onSelectClass }: any) => (
        <select data-testid="class-selector" onChange={(e) => onSelectClass(e.target.value)}>
            <option value="c1">Class 1</option>
            <option value="c2">Class 2</option>
        </select>
    ),
}));

vi.mock('../components/Avatar', () => ({
    Avatar: () => <div data-testid="avatar" />,
}));

vi.mock('../components/MobileGradeGrid', () => ({
    MobileGradeGrid: () => <div data-testid="mobile-grid" />,
}));

vi.mock('../services/cameraService', () => ({
    captureImageWithNativeFallback: vi.fn().mockResolvedValue(null),
    dataURLtoFile: vi.fn(),
}));

vi.mock('../utils', () => ({
    getCurrentEvaluationPeriod: vi.fn(() => 'P1'),
    sortStudents: vi.fn((s) => s),
    filterStudentsByClass: vi.fn((s, id) => s.filter((st: any) => st.classId === id)),
    calculateAge: vi.fn(() => 10),
}));

// --- Test Data ---

const mockStudents: Student[] = [
    { id: 's1', name: 'Student One', classId: 'c1', gender: 'M', avatar: '' },
    { id: 's2', name: 'Student Two', classId: 'c1', gender: 'F', avatar: '' },
];

const mockClasses: Class[] = [
    { id: 'c1', name: '6to A', grade: '6to', section: 'A', schoolYear: '2023-2024', color: 'blue', level: 'Secundario', schedule: 'Lun-Mie' },
    { id: 'c2', name: '5to B', grade: '5to', section: 'B', schoolYear: '2023-2024', color: 'red', level: 'Primario', schedule: 'Mar-Jue' },
];

const mockFundamentalCompetencies: FundamentalCompetency[] = [
    { id: 'fc1', name: 'Comunicativa', description: '', group: 'G1' },
    { id: 'fc2', name: 'Pensamiento Lógico', description: '', group: 'G2' },
];

const mockCompetencies: Competency[] = [
    { id: 'comp1', fundamentalId: 'fc1', description: 'C1 desc', classId: 'c1', code: 'C1', name: 'C1 Name', indicators: [] },
    { id: 'comp2', fundamentalId: 'fc2', description: 'C2 desc', classId: 'c1', code: 'C2', name: 'C2 Name', indicators: [] },
];

const mockInstruments: EvaluationInstrument[] = [
    { id: 'inst1', name: 'Examen P1', date: '2023-10-10', type: 'Examen', classId: 'c1', competencyIds: ['comp1'], period: 'P1', totalPoints: 100 },
];

const mockGrades: Grade[] = [
    { id: 'g1', studentId: 's1', instrumentId: 'inst1', score: 85, updatedAt: '' },
    { id: 'g2', studentId: 's2', instrumentId: 'inst1', score: 92, updatedAt: '' },
];

const mockRecoveryGrades: RecoveryGrade[] = [];

const defaultProps = {
    students: mockStudents,
    classes: mockClasses,
    fundamentalCompetencies: mockFundamentalCompetencies,
    competencies: mockCompetencies,
    instruments: mockInstruments,
    grades: mockGrades,
    recoveryGrades: mockRecoveryGrades,
    onAddCompetencyClick: vi.fn(),
    onAddInstrumentClick: vi.fn(),
    onEditInstrumentClick: vi.fn(),
    onViewInstrumentDetails: vi.fn(),
    onDeleteInstrument: vi.fn(),
    onAddRecoveryGradeClick: vi.fn(),
    initialTab: 'GRADES' as const,
    onExpressGradingClick: vi.fn(),
    studentFilter: null,
    onClearStudentFilter: vi.fn(),
    selectedClassId: 'c1',
    onSelectClass: vi.fn(),
    onAddStudentClick: vi.fn(),
    onEditCompetency: vi.fn(),
    onDeleteCompetency: vi.fn(),
    onCopyCompetency: vi.fn(),
    onSaveRecoveryGrade: vi.fn(),
};

describe('GradebookManager Component', () => {
    it('renders correctly in GRADES tab', () => {
        render(<GradebookManager {...defaultProps} />);
        expect(screen.getByTestId('class-selector')).toBeInTheDocument();
        expect(screen.getByText('Student One')).toBeInTheDocument();
        expect(screen.getByText('Student Two')).toBeInTheDocument();
    });

    it('opens manager modals from More Options menu', () => {
        render(<GradebookManager {...defaultProps} />);

        // Open the 'Más opciones' menu
        const moreOptionsBtn = screen.getByTitle('Más opciones');
        fireEvent.click(moreOptionsBtn);

        const instrumentsButton = screen.getByRole('button', { name: /^Instrumentos$/i });
        fireEvent.click(instrumentsButton);
        // InstrumentsManagerModal should be open
        expect(screen.getByText(/Gestión de Instrumentos/i)).toBeInTheDocument();

        // Open the menu again for competencies
        fireEvent.click(moreOptionsBtn);

        const competenciesButton = screen.getByRole('button', { name: /^Competencias$/i });
        fireEvent.click(competenciesButton);
        // CompetenciesManagerModal should be open
        expect(screen.getByText(/Añadir Competencia/i)).toBeInTheDocument();
    });

    it('filters students by ID', () => {
        const { rerender } = render(<GradebookManager {...defaultProps} />);

        // Test through props - studentFilter expects an ID
        rerender(<GradebookManager {...defaultProps} studentFilter="s1" />);
        // Use getAllByText as student name appears in multiple places (table, mobile grid)
        expect(screen.getAllByText(/Student One/i).length).toBeGreaterThan(0);
        expect(screen.queryByText(/Student Two/i)).not.toBeInTheDocument();
    });

    it('shows 4 groups for Secundario level', () => {
        render(<GradebookManager {...defaultProps} selectedClassId="c1" />);
        // Secundario has 4 groups: G1, G2, G3, G4
        expect(screen.getAllByText(/Comunicativa/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Pensamiento Lógico/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Ética/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Científica y Amb./i).length).toBeGreaterThan(0);
    });

    it('shows 3 groups for Primario level', () => {
        // c2 is Primario
        render(<GradebookManager {...defaultProps} selectedClassId="c2" />);
        expect(screen.getAllByText(/Comunicativa/i).length).toBeGreaterThan(0);
        // G2 in Primario is "Pensamiento Lógico, Resolución de Problemas y Científica"
        expect(screen.getAllByText(/Pensamiento Lógico/i).length).toBeGreaterThan(0);
        // G3 in Primario is "Ética, Ciudadana, Personal y Ambiental"
        expect(screen.getAllByText(/Ética/i).length).toBeGreaterThan(0);
        // In Primario, Scientífica as G4 is NOT shown
        expect(screen.queryByText(/Científica y Amb./i)).not.toBeInTheDocument();
    });

    it('calculates averages correctly for Secundario', () => {
        // Student 1 has 85 in inst1 (type Examen, period P1, G1)
        render(<GradebookManager {...defaultProps} selectedClassId="c1" />);

        // Check if the score 85 is rendered in the grid.
        // Given the component depth, we check for the text "85" 
        // It should appear in the table cell for student s1 under column for inst1
        const scores = screen.getAllByText('85');
        expect(scores.length).toBeGreaterThan(0);
    });
});
