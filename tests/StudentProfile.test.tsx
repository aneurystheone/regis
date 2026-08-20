import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { StudentProfile } from '../components/StudentProfile';
import type { Student, AnecdotalRecord, Class, AttendanceRecord, AIFeatures } from '../types';

// Mock icons
vi.mock('../components/icons', () => ({
    PlusIcon: () => <span />,
    SparklesIcon: () => <span />,
    CameraIcon: () => <span />,
    TableCellsIcon: () => <span />,
    MicrophoneIcon: () => <span />,
    XIcon: () => <span />,
    UserCircleIcon: () => <span />,
    HeartIcon: () => <span />,
    UserGroupIcon: (props: any) => <span {...props} data-testid="user-group-icon" />,
    WifiIcon: () => <span />,
    PencilIcon: () => <span />,
    CheckIcon: () => <span />,
    DocumentTextIcon: () => <span />,
    StarIcon: () => <span />,
}));

vi.mock('lucide-react', () => ({
    Camera: () => <span />,
    Image: () => <span />,
}));

// Mock framer-motion to bypass animations in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        ul: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../services/geminiService', () => ({
    generateStudentSummary: vi.fn(),
    transcribeAndAnalyzeAnecdote: vi.fn(),
}));

vi.mock('../services/storageService', () => ({
    uploadFileWithOfflineFallback: vi.fn(),
    dataURLToBlob: vi.fn(),
}));

vi.mock('../services/cameraService', () => ({
    captureImageWithNativeFallback: vi.fn().mockResolvedValue(null),
    dataURLtoFile: vi.fn(),
}));

vi.mock('../services/authService', () => ({
    authService: {
        isDemoMode: () => true,
        getCurrentUser: () => ({ id: 'demo' }),
    },
}));

vi.mock('../contexts/SubscriptionContext', () => ({
    useCanUseAI: () => false,
}));

vi.mock('../contexts/ConfirmationContext', () => ({
    useConfirm: () => vi.fn().mockResolvedValue(true),
    useAlert: () => vi.fn().mockResolvedValue(true),
}));

const mockStudents: Student[] = [
    { id: 's1', name: 'Ana López', classId: 'c1', gender: 'F', avatar: '' },
    { id: 's2', name: 'Pedro García', classId: 'c1', gender: 'M', avatar: '' },
    { id: 's3', name: 'Carlos Ruíz', classId: 'c1', gender: 'M', avatar: '' },
];

const mockClasses: Class[] = [
    { id: 'c1', name: 'Matemáticas', grade: '6to', section: 'A', schoolYear: '2025-2026', color: '#4f46e5', level: 'Secundario', schedule: '' },
];

const sharedDate = new Date().toISOString();
const mockAnecdotes: AnecdotalRecord[] = [
    // Multiple incident shared between Ana (s1) and Pedro (s2)
    { id: 'a1', studentId: 's1', date: sharedDate, note: 'Trabajaron excelente en equipo', category: 'Académico' },
    { id: 'a2', studentId: 's2', date: sharedDate, note: 'Trabajaron excelente en equipo', category: 'Académico' },
    // Single incident for Carlos (s3)
    { id: 'a3', studentId: 's3', date: sharedDate, note: 'Llegó tarde a clases', category: 'Comportamiento' },
];

const defaultProps = {
    student: mockStudents[0], // Ana López
    students: mockStudents,
    anecdotes: mockAnecdotes,
    attendance: [] as AttendanceRecord[],
    classes: mockClasses,
    onBack: vi.fn(),
    onAddAnecdote: vi.fn(),
    onViewGrades: vi.fn(),
    onUpdateStudent: vi.fn(),
    onEditClick: vi.fn(),
    aiFeatures: {} as AIFeatures,
};

describe('StudentProfile Anecdote Linking', () => {
    it('shows linked students tag for multiple incidents', () => {
        render(<StudentProfile {...defaultProps} />);

        // Should show the note
        expect(screen.getByText('Trabajaron excelente en equipo')).toBeInTheDocument();

        // Should show the linked student name (Pedro García)
        expect(screen.getByText('Con: Pedro García')).toBeInTheDocument();

        // Should NOT show own name (Ana López) in the linked students list
        expect(screen.queryByText(/Con:.*Ana López/)).toBeNull();
    });

    it('does not show linked students tag for single incidents', () => {
        // Render Carlos Ruíz's profile
        render(<StudentProfile {...defaultProps} student={mockStudents[2]} />);

        // Should show the note
        expect(screen.getByText('Llegó tarde a clases')).toBeInTheDocument();

        // Should NOT show any linked students tag since he is alone
        expect(screen.queryByText(/Con:/)).toBeNull();
    });
});
