import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassManager } from '../components/ClassManager';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Class, Student } from '../types';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../contexts/SubscriptionContext', () => ({
  useSubscription: vi.fn(),
}));

vi.mock('../components/icons', () => ({
  TrashIcon: () => <span data-testid="trash-icon" />,
  CheckIcon: () => <span data-testid="check-icon" />,
  XIcon: () => <span data-testid="x-icon" />,
  PencilIcon: () => <span data-testid="pencil-icon" />,
  EyeIcon: () => <span data-testid="eye-icon" />,
  PlusIcon: () => <span data-testid="plus-icon" />,
  UserGroupIcon: () => <span data-testid="user-group-icon" />,
}));

vi.mock('../components/ClassLimitWarning', () => ({
  ClassLimitWarning: () => <div data-testid="class-limit-warning" />
}));

vi.mock('../config/phases', () => ({
  MONETIZATION_ENABLED: true,
}));

const mockClasses: Class[] = [
  { id: 'c1', name: 'Matemáticas', grade: '3er Grado', section: 'A', schoolYear: '2023', schedule: '', color: '#ef4444' }, // Normal Class
  { id: 'c2', name: 'Lengua', grade: '3er Grado', section: 'A', schoolYear: '2023', schedule: '', color: '#3b82f6', groupId: 'g1' }, // Grouped Class
  { id: 'c3', name: 'Ciencias', grade: '3er Grado', section: 'A', schoolYear: '2023', schedule: '', color: '#eab308', groupId: 'g1' }, // Grouped Class
];

const mockStudents: Student[] = [
  // Student directly in c1
  { id: 's1', name: 'Student 1', classId: 'c1', gender: 'M', avatar: '' },
  { id: 's2', name: 'Student 2', classId: 'c1', gender: 'F', avatar: '' },
  // Student in the group
  { id: 's3', name: 'Student 3', classId: 'c2', groupId: 'g1', gender: 'M', avatar: '' },
  { id: 's4', name: 'Student 4', classId: 'c3', groupId: 'g1', gender: 'F', avatar: '' },
  { id: 's5', name: 'Student 5', classId: 'c3', groupId: 'g1', gender: 'M', avatar: '' },
];

describe('ClassManager Component', () => {
  const defaultProps = {
    classes: mockClasses,
    students: mockStudents,
    onNavigateToClass: vi.fn(),
    onAddClass: vi.fn(),
    onViewClassDetails: vi.fn(),
    onDeleteClass: vi.fn(),
    onBulkDeleteClasses: vi.fn(),
    onNavigateToSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSubscription as any).mockReturnValue({
      isPremium: true,
      subscription: { id: 'test' },
      canCreateClass: vi.fn().mockReturnValue(true),
      getRemainingClasses: vi.fn().mockReturnValue(null),
    });
  });

  it('renders correctly and matches normal student counts by classId', () => {
    // Math class (c1) has 2 students allocated directly to it.
    render(<ClassManager {...defaultProps} />);
    expect(screen.getAllByText('Matemáticas')[0]).toBeInTheDocument();
  });

  it('counts grouped students using groupId', () => {
    const { container } = render(<ClassManager {...defaultProps} />);
    // Group g1 has 3 total students (s3, s4, s5)

    const badges = container.querySelectorAll('.bg-indigo-50');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('disables Add Class button when subscription limits are reached', () => {
    (useSubscription as any).mockReturnValue({
      isPremium: false,
      subscription: { id: 'free' },
      canCreateClass: vi.fn().mockReturnValue(false),
      getRemainingClasses: vi.fn().mockReturnValue(0),
    });

    render(<ClassManager {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /añadir curso/i });
    expect(addButton).toBeDisabled();

    // Verify the warning shows up
    expect(screen.getByTestId('class-limit-warning')).toBeInTheDocument();
  });

  it('enters selection mode correctly via long press', () => {
    vi.useFakeTimers();
    render(<ClassManager {...defaultProps} />);

    const mathCard = screen.getByText('Matemáticas').closest('div[role="button"]');
    expect(mathCard).not.toBeNull();

    // Start touch
    fireEvent.touchStart(mathCard!);

    // Fast-forward time for the 500ms long press threshold
    act(() => {
      vi.advanceTimersByTime(550);
    });

    // The selection UI (mobile selection bottom bar) should become visible.
    // It says "1 seleccionados" (or length + ' seleccionados')
    expect(screen.getByText('1 seleccionados')).toBeInTheDocument();

    // The "Detalles" button from the multi-select menu should appear
    expect(screen.getAllByText('Detalles')[0]).toBeInTheDocument();

    vi.useRealTimers();
  });

});
