
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { sortStudents, filterStudentsByClass, normalizeText } from '../utils';
import { CSS } from '@dnd-kit/utilities';
import type { Student, Class } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, SwitchHorizontalIcon, SearchIcon, BookOpenIcon, StudentsIcon, DocumentAddIcon, XIcon, CheckIcon, SelectorIcon } from './icons';
import { ClassSelector } from './ClassSelector';
import { Avatar } from './Avatar';
import { useConfirm } from '../contexts/ConfirmationContext';
import { TeamBoard } from './TeamBoard';

interface StudentManagerProps {
    students: Student[];
    classes: Class[];
    onViewProfile: (student: Student) => void;
    onAddClassClick: () => void;
    onAddStudentClick: (classId: string) => void;
    onImportStudentsClick: () => void;
    onMoveStudentClick: (student: Student) => void;
    onEditStudentClick: (student: Student) => void;
    onMoveStudentBulkClick: (students: Student[]) => void;
    onEditStudentBulkClick: (students: Student[]) => void;
    onMoveToBinClick: (student: Student) => void;
    onMoveToBinBulkClick: (students: Student[]) => void;
    activeStudentId?: string;
    selectedClassId: string | null;
    onSelectClass: (classId: string) => void;
    onUpdateStudentsOrder: (classId: string, orderedStudentIds: string[]) => void;
    addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    onNavigate?: (view: any) => void;
}

const SortableStudentRow: React.FC<{
    student: Student;
    isSelected: boolean;
    isReorderMode: boolean;
    onViewProfile: (student: Student) => void;
    onSelectStudent: (id: string) => void;
    onMoveStudentClick: (student: Student) => void;
    onEditStudentClick: (student: Student) => void;
    onMoveToBinClick: (student: Student) => void;
}> = ({ student, isSelected, isReorderMode, onViewProfile, onSelectStudent, onMoveStudentClick, onEditStudentClick, onMoveToBinClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: student.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`transition-colors duration-150 ${isSelected
                ? 'bg-indigo-50 dark:bg-indigo-900/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                } ${isDragging ? 'shadow-2xl' : ''}`}
        >
            <td className="p-4">
                <div className="flex items-center gap-2">
                    {isReorderMode ? (
                        <button
                            {...attributes}
                            {...listeners}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
                        >
                            <SelectorIcon className="w-5 h-5" />
                        </button>
                    ) : (
                        <input
                            type="checkbox"
                            className="h-5 w-5 text-indigo-600 border-slate-300 dark:border-slate-500 rounded focus:ring-indigo-500 bg-white dark:bg-slate-600 cursor-pointer"
                            checked={isSelected}
                            onChange={() => onSelectStudent(student.id)}
                            aria-label={`Seleccionar a ${student.name}`}
                        />
                    )}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center cursor-pointer" onClick={() => onViewProfile(student)}>
                    {student.orderNumber && (
                        <span className="text-lg font-black text-slate-300 dark:text-slate-600 min-w-[2rem] text-center mr-2">
                            {student.orderNumber}
                        </span>
                    )}
                    <div className="flex-shrink-0 h-10 w-10 relative">
                        <Avatar
                            name={student.name}
                            src={student.avatar}
                            size="md"
                            className="border border-slate-200 dark:border-slate-600"
                        />
                    </div>
                    <div className="ml-4">
                        <div className={`text-sm font-bold ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-slate-100'}`}>{student.name}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{student.enrollmentId || '-'}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center space-x-2">
                    <button onClick={(e) => { e.stopPropagation(); onViewProfile(student); }} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1 rounded-lg transition-colors">Ver Perfil</button>
                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-2"></div>
                    <button onClick={(e) => { e.stopPropagation(); onMoveStudentClick(student); onSelectStudent(''); }} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Mover">
                        <SwitchHorizontalIcon />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onMoveToBinClick(student); onSelectStudent(''); }} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar"><TrashIcon className="w-4 h-4" /></button>
                </div>
            </td>
        </tr>
    );
};

const SortableStudentCard: React.FC<{
    student: Student;
    isSelected: boolean;
    isReorderMode: boolean;
    onClick: () => void;
    onTouchStart: (id: string) => void;
    onTouchMove: () => void;
    onTouchEnd: (e: React.TouchEvent) => void;
}> = ({ student, isSelected, isReorderMode, onClick, onTouchStart, onTouchMove, onTouchEnd }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: student.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}

            className={`relative rounded-2xl shadow-sm p-2 transition-all duration-200 touch-manipulation flex items-center justify-between gap-3 ${isSelected && !isReorderMode
                ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500 dark:ring-indigo-400 transform scale-[0.98]'
                : 'bg-white dark:bg-slate-800 active:scale-[0.98]'
                } ${isDragging ? 'shadow-2xl z-10 opacity-70' : ''}`}
            onClick={onClick}
            onTouchStart={() => onTouchStart(student.id)}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onContextMenu={(e) => e.preventDefault()}
        >
            {isSelected && !isReorderMode && (
                <div className="absolute top-3 right-3 bg-indigo-500 text-white rounded-full p-1 shadow-sm animate-scale-in">
                    <CheckIcon className="w-4 h-4" />
                </div>
            )}

            <div className="flex items-center gap-3 pointer-events-none flex-1">
                {student.orderNumber && (
                    <span className="text-lg font-black text-slate-300 dark:text-slate-600 min-w-[1.5rem] text-center">
                        {student.orderNumber}
                    </span>
                )}
                <div className="relative flex-shrink-0">
                    <Avatar
                        name={student.name}
                        src={student.avatar}
                        size="md"
                        className="h-10 w-10 border-2 border-slate-100 dark:border-slate-700"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                        <p className={`font-bold line-clamp-2 text-sm ${isSelected && !isReorderMode ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-slate-100'}`}>
                            {student.name}
                        </p>
                    </div>
                    {/* <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{student.enrollmentId || '-'}</p> */}
                </div>
            </div>

            {/* Drag Handle - Only in Reorder Mode - Moved to Right */}
            {isReorderMode && (
                <div
                    {...attributes}
                    {...listeners}
                    className="p-4 -mr-2 cursor-grab active:cursor-grabbing touch-none text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/40 rounded-xl"
                    onClick={(e) => e.stopPropagation()} // Prevent card click
                >
                    <SelectorIcon className="w-8 h-8" />
                </div>
            )}
        </div>
    );
};

export const StudentManager: React.FC<StudentManagerProps> = ({
    students,
    classes,
    onViewProfile,
    onAddClassClick,
    onAddStudentClick,
    onImportStudentsClick,
    onMoveStudentClick,
    onEditStudentClick,
    onMoveStudentBulkClick,
    onEditStudentBulkClick,
    onMoveToBinClick,
    onMoveToBinBulkClick,
    activeStudentId,
    selectedClassId,
    onSelectClass,
    onUpdateStudentsOrder,
    addToast,
    onNavigate
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [reorderedStudents, setReorderedStudents] = useState<Student[]>([]);
    const confirm = useConfirm();


    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const list = isReorderMode ? reorderedStudents : filteredStudents;
            const oldIndex = list.findIndex((s) => s.id === active.id);
            const newIndex = list.findIndex((s) => s.id === over.id);

            const newOrder = arrayMove(list, oldIndex, newIndex);

            if (isReorderMode) {
                setReorderedStudents(newOrder);
            } else if (selectedClassId) {
                onUpdateStudentsOrder(selectedClassId, newOrder.map((s: Student) => s.id));
            }
        }
    };

    // Long press state
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressTriggered = useRef(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [viewMode, setViewMode] = useState<'lista' | 'equipos'>('lista');

    useEffect(() => {
        setIsFabOpen(false);
    }, [selectedClassId, searchQuery]);

    const filteredStudents = useMemo(() => {
        const query = normalizeText(searchQuery);
        const filtered = filterStudentsByClass(students, selectedClassId, classes)
            .filter(s => normalizeText(s.name).includes(query));
        return sortStudents(filtered, searchQuery);
    }, [students, selectedClassId, searchQuery, classes]);

    useEffect(() => {
        if (!isReorderMode) {
            setReorderedStudents(filteredStudents);
        }
    }, [filteredStudents, isReorderMode]);

    useEffect(() => {
        setSelectedStudentIds([]);
        setIsSelectionMode(false);
    }, [selectedClassId, searchQuery]);

    useEffect(() => {
        if (selectedStudentIds.length === 0) {
            setIsSelectionMode(false);
        }
    }, [selectedStudentIds]);

    const handleSelectStudent = (studentId: string) => {
        setSelectedStudentIds(prev => {
            const isSelected = prev.includes(studentId);
            const newSelection = isSelected
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId];

            if (newSelection.length > 0) setIsSelectionMode(true);
            return newSelection;
        });
    };

    const handleSelectAll = () => {
        if (selectedStudentIds.length === filteredStudents.length) {
            setSelectedStudentIds([]);
            setIsSelectionMode(false);
        } else {
            setSelectedStudentIds(filteredStudents.map(s => s.id));
            setIsSelectionMode(true);
        }
    };

    const handleBulkMoveToBin = () => {
        const studentsToMove = students.filter(s => selectedStudentIds.includes(s.id));
        onMoveToBinBulkClick(studentsToMove);
        cancelSelectionMode();
    }

    const handleBulkMove = () => {
        const studentsToMove = students.filter(s => selectedStudentIds.includes(s.id));
        onMoveStudentBulkClick(studentsToMove);
        cancelSelectionMode();
    };

    const handleBulkEdit = () => {
        const studentsToEdit = students.filter(s => selectedStudentIds.includes(s.id));
        onEditStudentBulkClick(studentsToEdit);
        cancelSelectionMode();
    };

    const cancelSelectionMode = () => {
        setSelectedStudentIds([]);
        setIsSelectionMode(false);
    };

    const handleConfirmReorder = async () => {
        if (selectedClassId) {
            const isConfirmed = await confirm({
                title: 'Guardar orden',
                message: '¿Está seguro de que desea guardar el nuevo orden de los estudiantes?',
                type: 'question',
                confirmText: 'Guardar',
            });
            if (isConfirmed) {
                onUpdateStudentsOrder(selectedClassId, reorderedStudents.map(s => s.id));
                setIsReorderMode(false);
                addToast('Nuevo orden de estudiantes guardado correctamente.', 'success');
            }
        }
    };

    const handleCancelReorder = () => {
        setReorderedStudents(filteredStudents);
        setIsReorderMode(false);
    };

    const handleEnableReorderMode = () => {
        setIsReorderMode(true);
        setReorderedStudents(filteredStudents);
        setSelectedStudentIds([]);
        setIsSelectionMode(false);
    };

    // --- Touch Logic for Long Press ---
    const handleTouchStart = (studentId: string) => {
        if (isReorderMode) return; // Disable long press in reorder mode
        isLongPressTriggered.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPressTriggered.current = true;
            setIsSelectionMode(true);
            // Add to selection if not already
            setSelectedStudentIds(prev => prev.includes(studentId) ? prev : [...prev, studentId]);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 600); // 600ms threshold
    };

    const handleTouchMove = () => {
        // If user moves finger, cancel long press
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        // If long press was triggered, prevent the subsequent 'click' event
        if (isLongPressTriggered.current) {
            if (e.cancelable) e.preventDefault();
        }
    };

    // Standard Click Handler (Fires on Tap, respects Scroll)
    const handleStudentClick = (student: Student) => {
        if (isReorderMode) return;
        if (isSelectionMode) {
            handleSelectStudent(student.id);
        } else {
            onViewProfile(student);
        }
    };

    return (
        <div className="p-4 sm:p-8 pb-32">
            
            {/* Backdrop for FAB */}
            {isFabOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-20 backdrop-blur-sm"
                    onClick={() => setIsFabOpen(false)}
                    aria-hidden="true"
                ></div>
            )}

            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                    {/* ClassSelector (Mobile Only) */}
                    <div className="w-full md:hidden">
                        <ClassSelector
                            classes={classes}
                            selectedClassId={selectedClassId}
                            onSelectClass={onSelectClass}
                            className="w-full"
                            size="default"
                        />
                    </div>

                    {/* View Mode Toggle */}
                    {selectedClassId && (
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-shrink-0">
                            <button
                                onClick={() => setViewMode('lista')}
                                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'lista' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Lista de Estudiantes
                            </button>
                            <button
                                onClick={() => setViewMode('equipos')}
                                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'equipos' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Equipos de Trabajo
                            </button>
                        </div>
                    )}

                    {/* Search Input */}
                    <div className="relative w-full md:w-64 md:ml-auto">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-300" />
                        <input
                            id="student-search"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar estudiante..."
                            className="block w-full pl-10 pr-4 py-3 text-base border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl shadow-sm"
                        />
                    </div>
                </div>

                {/* Reorder Mode Toolbar (Confirm/Cancel) - Desktop Only */}
                {isReorderMode && (
                    <div className="hidden md:flex sticky top-0 z-50 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border-2 border-indigo-500 animate-slide-up flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full">
                                <SelectorIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Modo Reordenar</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Arrastra para cambiar el orden</p>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button
                                onClick={handleCancelReorder}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <XIcon className="w-5 h-5" /> Cancelar
                            </button>
                            <button
                                onClick={handleConfirmReorder}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                <CheckIcon className="w-5 h-5" /> Confirmar
                            </button>
                        </div>
                    </div>
                )}

                {/* Dedicated Mobile Reorder View */}
                {isReorderMode && (
                    <div className="md:hidden fixed inset-0 z-[100] h-[100dvh] w-screen bg-slate-50 dark:bg-slate-900 flex flex-col animate-fade-in touch-none">
                        {/* Header */}
                        <div className="bg-white dark:bg-slate-800 px-4 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full">
                                    <SelectorIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight">Reordenar</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{reorderedStudents.length} estudiantes</p>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={reorderedStudents.map(s => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {reorderedStudents.map(student => (
                                        <SortableStudentCard
                                            key={student.id}
                                            student={student}
                                            isSelected={false}
                                            isReorderMode={true}
                                            onClick={() => { }}
                                            onTouchStart={() => { }}
                                            onTouchMove={() => { }}
                                            onTouchEnd={() => { }}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>

                        {/* Footer Actions */}
                        <div className="bg-white dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 pb-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10 shrink-0">
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancelReorder}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 active:bg-slate-100 transition-colors"
                                >
                                    <XIcon className="w-5 h-5" /> Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmReorder}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                >
                                    <CheckIcon className="w-5 h-5" /> Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {selectedStudentIds.length > 0 && (
                    <>
                        <div className="hidden md:flex sticky top-0 z-10 bg-indigo-50 dark:bg-indigo-900/90 backdrop-blur-sm p-4 rounded-xl mb-6 justify-between items-center shadow-md border border-indigo-100 dark:border-indigo-700">
                            <div className="flex items-center gap-4">
                                <button onClick={cancelSelectionMode} className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full text-indigo-700 dark:text-indigo-300 transition-colors">
                                    <XIcon className="w-5 h-5" />
                                </button>
                                <p className="text-base font-bold text-indigo-900 dark:text-indigo-100">{selectedStudentIds.length} seleccionados</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleEnableReorderMode} className="flex items-center text-sm bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-sm border border-slate-200 dark:border-slate-600">
                                    <SelectorIcon className="mr-2 w-4 h-4" /> Reordenar
                                </button>
                                <button onClick={handleBulkEdit} className="flex items-center text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-sm border border-slate-200 dark:border-slate-600">
                                    <PencilIcon className="mr-2 w-4 h-4" /> Editar
                                </button>
                                <button onClick={handleBulkMove} className="flex items-center text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-sm border border-slate-200 dark:border-slate-600">
                                    <SwitchHorizontalIcon className="mr-2 w-4 h-4" /> Mover
                                </button>
                                <button onClick={handleBulkMoveToBin} className="flex items-center text-sm bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors shadow-sm">
                                    <TrashIcon className="mr-2 w-4 h-4" /> Eliminar
                                </button>
                            </div>
                        </div>

                        <div className="md:hidden fixed bottom-24 left-4 right-4 z-40 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col gap-4 animate-slide-up">
                            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                                <span className="font-bold text-lg">{selectedStudentIds.length} seleccionados</span>
                                <button onClick={cancelSelectionMode} className="bg-slate-700 p-2 rounded-full hover:bg-slate-600">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex justify-between gap-2">
                                {selectedStudentIds.length === 1 && (
                                    <button
                                        onClick={() => {
                                            const student = students.find(s => s.id === selectedStudentIds[0]);
                                            if (student) onViewProfile(student);
                                            cancelSelectionMode();
                                        }}
                                        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-white/10"
                                    >
                                        <StudentsIcon className="w-6 h-6" />
                                        <span className="text-xs font-medium">Perfil</span>
                                    </button>
                                )}


                                <button onClick={() => { handleBulkMove(); cancelSelectionMode(); }} className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-white/10">
                                    <SwitchHorizontalIcon className="w-6 h-6" />
                                    <span className="text-xs font-medium">Mover</span>
                                </button>
                                <button onClick={() => { handleEnableReorderMode(); }} className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-white/10 text-indigo-400">
                                    <SelectorIcon className="w-6 h-6" />
                                    <span className="text-xs font-medium">Reordenar</span>
                                </button>
                                <button onClick={() => { handleBulkMoveToBin(); cancelSelectionMode(); }} className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-red-500/20 text-red-400">
                                    <TrashIcon className="w-6 h-6" />
                                    <span className="text-xs font-medium">Eliminar</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {viewMode === 'equipos' ? (
                    <TeamBoard 
                        students={filteredStudents} 
                        currentClass={classes.find(c => c.id === selectedClassId)} 
                        addToast={addToast} 
                    />
                ) : (
                    <>
                        {/* Table for Desktop */}
                        <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-x-auto border border-slate-200 dark:border-slate-700">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                                        <tr>
                                            <th scope="col" className="p-4 w-12">
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 text-indigo-600 border-slate-300 dark:border-slate-500 rounded focus:ring-indigo-500 bg-white dark:bg-slate-600 cursor-pointer"
                                                    checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                                                    onChange={handleSelectAll}
                                                    aria-label="Seleccionar todos los estudiantes"
                                                />
                                            </th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Nombre</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">ID</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                        <SortableContext
                                            items={(isReorderMode ? reorderedStudents : filteredStudents).map(s => s.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {(isReorderMode ? reorderedStudents : filteredStudents).map((student) => (
                                                <SortableStudentRow
                                                    key={student.id}
                                                    student={student}
                                                    isSelected={selectedStudentIds.includes(student.id)}
                                                    isReorderMode={isReorderMode}
                                                    onViewProfile={(s) => { onViewProfile(s); cancelSelectionMode(); }}
                                                    onSelectStudent={handleSelectStudent}
                                                    onMoveStudentClick={(s) => { onMoveStudentClick(s); cancelSelectionMode(); }}
                                                    onEditStudentClick={(s) => { onEditStudentClick(s); cancelSelectionMode(); }}
                                                    onMoveToBinClick={(s) => { onMoveToBinClick(s); cancelSelectionMode(); }}
                                                />
                                            ))}
                                        </SortableContext>
                                        {filteredStudents.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center py-12 text-slate-500 dark:text-slate-400">
                                                    {searchQuery ? (
                                                        <div className="flex flex-col items-center">
                                                            <SearchIcon className="w-12 h-12 text-slate-300 mb-2" />
                                                            <p>No se encontraron estudiantes para "{searchQuery}".</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center gap-3">
                                                            <p>No hay estudiantes en esta clase.</p>
                                                            {selectedClassId && (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => onAddStudentClick(selectedClassId)}
                                                                        className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                                                    >
                                                                        <PlusIcon className="w-5 h-5 mr-2" />
                                                                        Añadir Estudiante
                                                                    </button>
                                                                    <button
                                                                        onClick={onImportStudentsClick}
                                                                        className="flex items-center bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm border border-slate-200 dark:border-slate-600"
                                                                    >
                                                                        <DocumentAddIcon className="w-5 h-5 mr-2" />
                                                                        Importar Lista
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </DndContext>
                        </div>

                        {/* Cards for Mobile with Long Press */}
                        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
                            {selectedClassId && (
                                <div className="flex items-center justify-between px-1 pb-2">
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleSelectAll} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                                            {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">Mantén presionado para seleccionar</p>
                                </div>
                            )}

                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={(isReorderMode ? reorderedStudents : filteredStudents).map(s => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {(isReorderMode ? reorderedStudents : filteredStudents).map(student => (
                                        <SortableStudentCard
                                            key={student.id}
                                            student={student}
                                            isSelected={selectedStudentIds.includes(student.id)}
                                            isReorderMode={isReorderMode}
                                            onClick={() => handleStudentClick(student)}
                                            onTouchStart={handleTouchStart}
                                            onTouchMove={handleTouchMove}
                                            onTouchEnd={handleTouchEnd}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                            {filteredStudents.length === 0 && (
                                <div className="col-span-1 sm:col-span-2 text-center py-12 px-4 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-dashed border-slate-200 dark:border-slate-700">
                                    {searchQuery ? (
                                        `No se encontraron estudiantes para "${searchQuery}".`
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <p>No hay estudiantes en esta clase.</p>
                                            {selectedClassId && (
                                                <div className="flex flex-col w-full gap-3">
                                                    <button
                                                        onClick={() => onAddStudentClick(selectedClassId)}
                                                        className="flex items-center justify-center w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                                    >
                                                        <PlusIcon className="w-5 h-5 mr-2" />
                                                        Añadir Estudiante
                                                    </button>
                                                    <button
                                                        onClick={onImportStudentsClick}
                                                        className="flex items-center justify-center w-full bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm border border-slate-200 dark:border-slate-600"
                                                    >
                                                        <DocumentAddIcon className="w-5 h-5 mr-2" />
                                                        Importar Lista
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {!isSelectionMode && !isReorderMode && (<div className="fixed bottom-6 right-6 z-30 flex flex-col items-end pointer-events-none mb-24 md:mb-20">
                <div
                    className={`flex flex-col items-end space-y-4 mb-4 transition-all duration-300 ease-in-out ${isFabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'
                        }`}
                >
                    <div className="flex items-center gap-3 group">
                        <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 transform transition-transform group-hover:-translate-x-1">Importar Lista</span>
                        <button
                            onClick={() => { onImportStudentsClick(); setIsFabOpen(false); }}
                            className="bg-slate-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 p-3 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors shadow-lg border border-indigo-100 dark:border-slate-600"
                        >
                            <DocumentAddIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3 group">
                        <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 transform transition-transform group-hover:-translate-x-1">Nuevo Estudiante</span>
                        <button
                            onClick={() => { if (selectedClassId) { onAddStudentClick(selectedClassId); setIsFabOpen(false); } }}
                            disabled={!selectedClassId}
                            className="bg-slate-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 p-3 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors shadow-lg border border-indigo-100 dark:border-slate-600 disabled:opacity-50"
                        >
                            <StudentsIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => setIsFabOpen(!isFabOpen)}
                    className={`bg-indigo-600 text-white p-4 rounded-full shadow-xl hover:bg-indigo-500 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 pointer-events-auto ${isFabOpen ? 'rotate-45' : ''}`}
                    aria-label="Menú de acciones"
                    aria-haspopup="true"
                    aria-expanded={isFabOpen}
                >
                    <PlusIcon className="w-8 h-8" />
                </button>
            </div>
            )}
        </div>
    );
};
