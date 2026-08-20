import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- Explicit named mocks ---
vi.mock('../components/icons', () => ({
    PlusIcon: (props: any) => <span {...props} />,
    PencilIcon: (props: any) => <span {...props} />,
    TrashIcon: (props: any) => <span {...props} />,
    SwitchHorizontalIcon: (props: any) => <span {...props} />,
    SearchIcon: (props: any) => <span {...props} />,
    BookOpenIcon: (props: any) => <span {...props} />,
    StudentsIcon: (props: any) => <span {...props} />,
    DocumentAddIcon: (props: any) => <span {...props} />,
    XIcon: (props: any) => <span {...props} />,
    CheckIcon: (props: any) => <span {...props} />,
    SelectorIcon: (props: any) => <span {...props} />,
}));

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
vi.mock('@dnd-kit/core', () => ({
    DndContext: ({ children }: any) => <div>{children}</div>,
    closestCenter: vi.fn(), KeyboardSensor: vi.fn(), PointerSensor: vi.fn(),
    useSensor: vi.fn(), useSensors: vi.fn(() => []),
}));
vi.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({ children }: any) => <div>{children}</div>,
    verticalListSortingStrategy: {},
    sortableKeyboardCoordinates: vi.fn(),
    useSortable: () => ({
        attributes: {}, listeners: {}, setNodeRef: vi.fn(),
        transform: null, transition: null, isDragging: false,
    }),
}));
vi.mock('@dnd-kit/utilities', () => ({
    CSS: { Transform: { toString: () => '' } },
}));
vi.mock('../contexts/ConfirmationContext', () => ({
    useConfirm: () => vi.fn().mockResolvedValue(true),
    useAlert: () => vi.fn().mockResolvedValue(true),
}));

import { StudentManager } from '../components/StudentManager';
import type { Student, Class } from '../types';

const mockClasses: Class[] = [
    { id: 'c1', name: 'Matemáticas', grade: '6to', section: 'A', schoolYear: '2025-2026', color: '#4f46e5', level: 'Secundario', schedule: '' },
    { id: 'c2', name: 'Ciencias', grade: '6to', section: 'B', schoolYear: '2025-2026', color: '#22c55e', level: 'Secundario', schedule: '' },
];

const mockStudents: Student[] = [
    { id: 's1', name: 'Ana López', classId: 'c1', gender: 'F', avatar: '', orderNumber: 1 },
    { id: 's2', name: 'Pedro García', classId: 'c1', gender: 'M', avatar: '', orderNumber: 2 },
    { id: 's3', name: 'María Sánchez', classId: 'c1', gender: 'F', avatar: '', orderNumber: 3 },
    { id: 's4', name: 'Juan Díaz', classId: 'c2', gender: 'M', avatar: '', orderNumber: 1 },
];

const defaultProps = {
    students: mockStudents,
    classes: mockClasses,
    onViewProfile: vi.fn(),
    onAddClassClick: vi.fn(),
    onAddStudentClick: vi.fn(),
    onImportStudentsClick: vi.fn(),
    onMoveStudentClick: vi.fn(),
    onEditStudentClick: vi.fn(),
    onMoveStudentBulkClick: vi.fn(),
    onEditStudentBulkClick: vi.fn(),
    onMoveToBinClick: vi.fn(),
    onMoveToBinBulkClick: vi.fn(),
    activeStudentId: null as string | null,
    selectedClassId: 'c1',
    onSelectClass: vi.fn(),
    onUpdateStudentsOrder: vi.fn(),
    addToast: vi.fn(),
};

beforeEach(() => { vi.clearAllMocks(); });

describe('StudentManager Rendering', () => {
    it('renders student names for selected class', () => {
        render(<StudentManager {...defaultProps} />);
        expect(screen.getAllByText('Ana López').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Pedro García').length).toBeGreaterThan(0);
        expect(screen.getAllByText('María Sánchez').length).toBeGreaterThan(0);
    });

    it('does not render students from other classes', () => {
        render(<StudentManager {...defaultProps} />);
        expect(screen.queryByText('Juan Díaz')).toBeNull();
    });

    it('shows empty state when no students', () => {
        render(<StudentManager {...defaultProps} students={[]} />);
        expect(screen.getAllByText(/No hay estudiantes/i).length).toBeGreaterThan(0);
    });

    it('shows student count', () => {
        render(<StudentManager {...defaultProps} />);
        expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    });

    it('renders class selector', () => {
        render(<StudentManager {...defaultProps} />);
        expect(screen.getByTestId('class-selector')).toBeTruthy();
    });

    it('renders order numbers', () => {
        render(<StudentManager {...defaultProps} />);
        expect(screen.getAllByText('1').length).toBeGreaterThan(0);
        expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });
});

describe('StudentManager Search', () => {
    it('renders search input', () => {
        render(<StudentManager {...defaultProps} />);
        expect(screen.getByPlaceholderText(/buscar/i)).toBeTruthy();
    });

    it('filters students by name', () => {
        render(<StudentManager {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'Ana' } });
        expect(screen.getAllByText('Ana López').length).toBeGreaterThan(0);
        expect(screen.queryByText('Pedro García')).toBeNull();
    });

    it('shows all students when search cleared', () => {
        render(<StudentManager {...defaultProps} />);
        const input = screen.getByPlaceholderText(/buscar/i);
        fireEvent.change(input, { target: { value: 'Ana' } });
        fireEvent.change(input, { target: { value: '' } });
        expect(screen.getAllByText('Ana López').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Pedro García').length).toBeGreaterThan(0);
    });
});

describe('StudentManager Actions', () => {
    it('shows add student button', () => {
        render(<StudentManager {...defaultProps} />);
        expect(screen.getAllByText(/(Añadir|Nuevo) Estudiante/i).length).toBeGreaterThan(0);
    });

    it('shows import button', () => {
        render(<StudentManager {...defaultProps} />);
        expect(screen.getAllByText(/Importar/i).length).toBeGreaterThan(0);
    });
});
