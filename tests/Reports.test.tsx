import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Reports } from '../components/Reports';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useUsageSession } from '../services/usageService';
import { api } from '../services/api';

// --- Mocks ---

vi.mock('motion/react', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
        h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
        p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
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
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../contexts/SubscriptionContext', () => ({
    useSubscription: vi.fn(),
}));

vi.mock('../services/usageService', () => ({
    useUsageSession: vi.fn(() => ({
        logSession: vi.fn(),
    })),
}));

vi.mock('../services/api', () => ({
    api: {
        getTeacherProfile: vi.fn().mockResolvedValue({
            name: 'Test Teacher',
            regional: '08',
            district: '03',
            schoolName: 'Test School',
        }),
    },
}));

vi.mock('jspdf', () => {
    return {
        jsPDF: class {
            internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 }, getNumberOfPages: () => 1 };
            setFont = vi.fn().mockReturnThis();
            setFontSize = vi.fn().mockReturnThis();
            setTextColor = vi.fn().mockReturnThis();
            text = vi.fn().mockReturnThis();
            setLineWidth = vi.fn().mockReturnThis();
            setDrawColor = vi.fn().mockReturnThis();
            rect = vi.fn().mockReturnThis();
            saveGraphicsState = vi.fn().mockReturnThis();
            restoreGraphicsState = vi.fn().mockReturnThis();
            setGState = vi.fn().mockReturnThis();
            GState = vi.fn();
            link = vi.fn().mockReturnThis();
            addImage = vi.fn().mockReturnThis();
            save = vi.fn().mockReturnThis();
            splitTextToSize = vi.fn().mockImplementation((t) => [t]);
            line = vi.fn().mockReturnThis();
            setFillColor = vi.fn().mockReturnThis();
            setPage = vi.fn().mockReturnThis();
        }
    };
});

vi.mock('jspdf-autotable', () => ({
    default: vi.fn(),
}));

vi.mock('../utils', () => ({
    sortStudents: vi.fn((s) => s),
    filterStudentsByClass: vi.fn((s, id) => s.filter((st: any) => st.classId === id)),
    calculateAge: vi.fn(() => 10),
}));

vi.mock('../services/geminiService', () => ({
    generateStudentSummary: vi.fn(),
}));

vi.mock('qrcode', () => ({
    toDataURL: vi.fn().mockResolvedValue('mock-qr-data'),
}));

vi.mock('../components/icons', () => ({
    DownloadIcon: () => <span data-testid="download-icon" />,
    SparklesIcon: () => <span data-testid="sparkles-icon" />,
    AcademicCapIcon: () => <span data-testid="cap-icon" />,
    StarIcon: () => <span data-testid="star-icon" />,
    DocumentTextIcon: () => <span data-testid="doc-icon" />,
    SendIcon: () => <span data-testid="send-icon" />,
    AlertTriangleIcon: () => <span data-testid="alert-icon" />,
    ClipboardCheckIcon: () => <span data-testid="clipboard-icon" />,
    HeartIcon: () => <span data-testid="heart-icon" />,
    MessageSquareIcon: () => <span data-testid="message-icon" />,
    UserGroupIcon: () => <span data-testid="users-icon" />,
    ActivityIcon: () => <span data-testid="activity-icon" />,
    HomeIcon: () => <span data-testid="home-icon" />,
    XIcon: () => <span data-testid="x-icon" />,
}));

vi.mock('../components/ClassSelector', () => ({
    ClassSelector: ({ onSelectClass }: any) => (
        <select data-testid="class-selector" onChange={(e) => onSelectClass(e.target.value)}>
            <option value="c1">Class 1</option>
            <option value="c2">Class 2</option>
        </select>
    ),
}));

vi.mock('../components/GuidanceReferralModal', () => ({
    GuidanceReferralModal: ({ isOpen, onClose }: any) =>
        isOpen ? <div data-testid="guidance-modal"><button onClick={onClose}>Close</button></div> : null,
}));

import { Student, Class, TeacherProfileData } from '../types';

// --- Test Data ---

const mockStudents: Student[] = [
    { id: 's1', name: 'Student One', classId: 'c1', gender: 'M', avatar: '' },
    { id: 's2', name: 'Student Two', classId: 'c2', gender: 'F', avatar: '' },
];

const mockClasses = [
    { id: 'c1', name: 'Math', grade: '1st', section: 'A', schoolYear: '2023-2024', color: 'red', schedule: '' },
    { id: 'c2', name: 'Science', grade: '2nd', section: 'B', schoolYear: '2023-2024', color: 'blue', schedule: '' },
];

describe('Reports Component', () => {
    const defaultProps = {
        students: mockStudents,
        classes: mockClasses,
        attendance: [],
        anecdotes: [],
        instruments: [],
        grades: [],
        recoveryGrades: [],
        teacherName: 'John Doe',
        fundamentalCompetencies: [],
        competencies: [],
        selectedClassId: 'c1',
        onSelectClass: vi.fn(),
        aiFeatures: {
            summaryGeneration: true,
            criteriaGeneration: true,
            lessonPlanning: true,
            studentExtraction: true,
            audioAnalysis: true,
            vicenteAssistant: true,
        },
        addToast: vi.fn(),
        onAddStudentClick: vi.fn(),
        onImportStudentsClick: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useSubscription as any).mockReturnValue({ isPremium: false });
    });

    it('renders reports list correctly', async () => {
        render(<Reports {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText(/Documentos Oficiales/i)).toBeInTheDocument();
            expect(screen.getByText(/Reportes Complementarios/i)).toBeInTheDocument();
        });
    });

    it('opens the configuration modal before generating specific reports', async () => {
        render(<Reports {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText(/Control Mensual/i)).toBeInTheDocument();
        });

        const controlBtn = screen.getByText(/Control Mensual/i);
        fireEvent.click(controlBtn);

        expect(screen.getByText(/Configurar Reporte/i)).toBeInTheDocument();

        // Close modal
        const cancelBtn = screen.getByText(/Cancelar/i);
        fireEvent.click(cancelBtn);
        expect(screen.queryByText(/Configurar Reporte/i)).not.toBeInTheDocument();
    });

    it('opens and closes the GuidanceReferralModal through the config modal', async () => {
        render(<Reports {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText(/Referimiento a Orientación/i)).toBeInTheDocument();
        });

        // Click the main button
        const guidanceBtn = screen.getByText(/Referimiento a Orientación/i);
        fireEvent.click(guidanceBtn);

        // Modal should open
        expect(screen.getByText(/Configurar Reporte/i)).toBeInTheDocument();

        // Click continue
        const continueBtn = screen.getByText(/Continuar/i);
        fireEvent.click(continueBtn);

        // Now GuidanceReferralModal should be open
        expect(screen.getByTestId('guidance-modal')).toBeInTheDocument();

        // Close it
        const closeBtn = screen.getByText('Close');
        fireEvent.click(closeBtn);

        expect(screen.queryByTestId('guidance-modal')).not.toBeInTheDocument();
    });

    it('triggers PDF generation directly for class-wide reports', async () => {
        (useSubscription as any).mockReturnValue({ isPremium: true });
        render(<Reports {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText(/Boletín de Calificaciones/i)).toBeInTheDocument();
        });

        const bulletinBtn = screen.getByText(/Boletín de Calificaciones/i);
        fireEvent.click(bulletinBtn);

        // Should show loading state (toast is called)
        await waitFor(() => {
            expect(defaultProps.addToast).toHaveBeenCalledWith('Reporte descargado correctamente.', 'success');
        });
    });

    it('fetches teacher profile on mount', async () => {
        render(<Reports {...defaultProps} />);
        await waitFor(() => {
            expect(api.getTeacherProfile).toHaveBeenCalled();
        });
    });
});
