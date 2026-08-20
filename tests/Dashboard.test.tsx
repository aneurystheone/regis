import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- Explicit named mocks (Proxy pattern hangs jsdom) ---
vi.mock('../components/icons', () => ({
    ClipboardCheckIcon: (props: any) => <span {...props} />,
    ExclamationIcon: (props: any) => <span {...props} />,
    StarIcon: (props: any) => <span {...props} />,
    PencilSquareIcon: (props: any) => <span {...props} />,
    ClockIcon: (props: any) => <span {...props} />,
    BoltIcon: (props: any) => <span {...props} />,
    CalendarIcon: (props: any) => <span {...props} />,
    DocumentTextIcon: (props: any) => <span {...props} />,
    ChevronRightIcon: (props: any) => <span {...props} />,
}));
vi.mock('lucide-react', () => ({
    CheckCircle2: (props: any) => <span {...props} />,
    Circle: (props: any) => <span {...props} />,
    BookOpen: (props: any) => <span {...props} />,
    ArrowRight: (props: any) => <span data-testid="arrow-right" {...props} />,
    UserPlus: (props: any) => <span {...props} />,
    ClipboardList: (props: any) => <span {...props} />,
    Sparkles: (props: any) => <span {...props} />,
    FileText: (props: any) => <span {...props} />,
    ChevronRight: (props: any) => <span {...props} />,
    Trophy: (props: any) => <span {...props} />,
    X: (props: any) => <span {...props} />,
    Calendar: (props: any) => <span {...props} />,
}));

vi.mock('motion/react', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { Dashboard } from '../components/Dashboard';
import type { Class, Student, EvaluationInstrument, AttendanceRecord, Grade, AIFeatures } from '../types';

const mockClasses: Class[] = [
    { id: 'c1', name: 'Matemáticas', grade: '6to', section: 'A', schoolYear: '2025-2026', color: '#4f46e5', level: 'Secundario', schedule: '' },
    { id: 'c2', name: 'Ciencias', grade: '6to', section: 'B', schoolYear: '2025-2026', color: '#22c55e', level: 'Secundario', schedule: '' },
];

const mockStudents: Student[] = [
    { id: 's1', name: 'Ana López', classId: 'c1', gender: 'F', avatar: '' },
    { id: 's2', name: 'Pedro García', classId: 'c1', gender: 'M', avatar: '' },
];

const mockInstruments: EvaluationInstrument[] = [
    { id: 'i1', name: 'Examen Final', date: '2025-06-15', type: 'Examen', classId: 'c1', competencyIds: [], period: 'P1', totalPoints: 100 },
];

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const yyyy = tomorrow.getFullYear();
const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
const dd = String(tomorrow.getDate()).padStart(2, '0');
const tomorrowStr = `${yyyy}-${mm}-${dd}`;

const mockFutureEvents = [
    { id: 'ev1', title: 'Reunión de padres', date: tomorrowStr, type: 'meeting', color: '#f59e0b' },
];

const mockFutureInstruments: EvaluationInstrument[] = [
    { id: 'fi1', name: 'Quiz de Mate', date: tomorrowStr, type: 'Prueba Corta', classId: 'c1', competencyIds: [], period: 'P1', totalPoints: 50 },
];

const defaultProps = {
    userName: 'María García',
    classes: mockClasses,
    students: mockStudents,
    instruments: mockInstruments,
    attendance: [] as AttendanceRecord[],
    grades: [] as Grade[],
    onNavigate: vi.fn(),
    onAddAnecdoteClick: vi.fn(),
    selectedClassId: 'c1',
    onSelectClass: vi.fn(),
    aiFeatures: { summaryGeneration: false, criteriaGeneration: false, lessonPlanning: false, studentExtraction: false, audioAnalysis: false, vicenteAssistant: false } as AIFeatures,
    customEvents: [],
};

beforeEach(() => { vi.clearAllMocks(); });

describe('Dashboard Rendering', () => {
    it('renders greeting with first name', () => {
        render(<Dashboard {...defaultProps} />);
        expect(screen.getByText(/María/)).toBeTruthy();
    });

    it('renders Mis Clases section', () => {
        render(<Dashboard {...defaultProps} />);
        expect(screen.getByText('Mis Clases')).toBeTruthy();
    });

    it('shows class names', () => {
        render(<Dashboard {...defaultProps} />);
        expect(screen.getByText('Matemáticas')).toBeTruthy();
        expect(screen.getByText('Ciencias')).toBeTruthy();
    });
});


describe('Dashboard Class Selection', () => {
    it('calls onSelectClass when clicking a class', () => {
        render(<Dashboard {...defaultProps} />);
        fireEvent.click(screen.getByText('Ciencias'));
        expect(defaultProps.onSelectClass).toHaveBeenCalledWith('c2');
    });
});

describe('Dashboard Upcoming Events', () => {
    it('shows "Sin eventos próximos" when empty', () => {
        render(<Dashboard {...defaultProps} />);
        expect(screen.getByText('Sin eventos próximos')).toBeTruthy();
    });

    it('shows upcoming custom events', () => {
        render(<Dashboard {...defaultProps} customEvents={mockFutureEvents} />);
        expect(screen.getByText('Reunión de padres')).toBeTruthy();
    });

    it('shows upcoming instruments with Evaluación tag', () => {
        render(<Dashboard {...defaultProps} instruments={[...mockInstruments, ...mockFutureInstruments]} />);
        expect(screen.getByText('Quiz de Mate')).toBeTruthy();
        expect(screen.getByText('Evaluación')).toBeTruthy();
    });

    it('shows Mañana for tomorrow events', () => {
        render(<Dashboard {...defaultProps} customEvents={mockFutureEvents} />);
        expect(screen.getByText('Mañana')).toBeTruthy();
    });
});

describe('Dashboard CTA', () => {
    it('renders a CTA button', () => {
        render(<Dashboard {...defaultProps} />);
        const ctaTexts = ['Planificar semana', 'Pasar lista', 'Calificar', 'Todo al día', 'Fin de semana'];
        expect(ctaTexts.some(text => screen.queryByText(text) !== null)).toBe(true);
    });

    it('CTA navigates on click', () => {
        render(<Dashboard {...defaultProps} />);
        const arrow = screen.getByTestId('arrow-right');
        const ctaButton = arrow.closest('button');
        if (ctaButton) {
            fireEvent.click(ctaButton);
            expect(defaultProps.onNavigate).toHaveBeenCalled();
        }
    });
});

describe('Dashboard Onboarding Missions', () => {
    it('shows only 3 missions prioritizing uncompleted ones', () => {
        const onboardingMissions = {
            profileSetup: true,
            classesCreated: true,      // Completed (Configura tus cursos)
            studentsImported: false,    // Uncompleted (Recluta a tus estudiantes)
            firstAttendance: true,     // Completed (Pasa tu primera lista)
            firstInstrument: false,    // Uncompleted (Crea tu primer instrumento)
            firstReport: false,        // Uncompleted (Genera tu reporte mágico)
        };

        render(<Dashboard {...defaultProps} onboardingMissions={onboardingMissions} />);

        // Uncompleted ones should be visible
        expect(screen.getByText('Recluta a tus estudiantes')).toBeTruthy();
        expect(screen.getByText('Crea tu primer instrumento')).toBeTruthy();
        expect(screen.getByText('Genera tu reporte mágico')).toBeTruthy();

        // Completed ones should NOT be visible because we only show 3 and have 3 uncompleted ones
        expect(screen.queryByText('Configura tus cursos')).toBeNull();
        expect(screen.queryByText('Pasa tu primera lista')).toBeNull();
    });

    it('shows completed missions if we have fewer than 3 uncompleted ones', () => {
        const onboardingMissions: OnboardingMissions = {
            profileSetup: true,        // Completed (Agrega tu horario y centro)
            classesCreated: true,      // Completed (Configura tus cursos)
            studentsImported: true,     // Completed (Recluta a tus estudiantes)
            firstAttendance: true,     // Completed (Pasa tu primera lista)
            firstInstrument: false,    // Uncompleted (Crea tu primer instrumento)
            firstReport: false,        // Uncompleted (Genera tu reporte mágico)
        };

        render(<Dashboard {...defaultProps} onboardingMissions={onboardingMissions} />);

        // Uncompleted ones must be visible
        expect(screen.getByText('Crea tu primer instrumento')).toBeTruthy();
        expect(screen.getByText('Genera tu reporte mágico')).toBeTruthy();

        // One completed one should be visible to make it 3
        const possibleCompleted = [
            screen.queryByText('Agrega tu horario y centro'),
            screen.queryByText('Configura tus cursos'),
            screen.queryByText('Recluta a tus estudiantes'),
            screen.queryByText('Pasa tu primera lista')
        ].filter(el => el !== null);

        expect(possibleCompleted.length).toBe(1);
    });
});

