
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Student, Class } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, SwitchHorizontalIcon, SearchIcon, BookOpenIcon, StudentsIcon, DocumentAddIcon, XIcon, CheckIcon } from './icons';
import { ClassSelector } from './ClassSelector';
import { Avatar } from './Avatar';

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
}

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
    onSelectClass
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [isFabOpen, setIsFabOpen] = useState(false);

    // Long press state
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressTriggered = useRef(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    useEffect(() => {
        setIsFabOpen(false);
    }, [selectedClassId, searchQuery]);

    const filteredStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students
            .filter(s => s.classId === selectedClassId)
            .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999) || a.name.localeCompare(b.name));
    }, [students, selectedClassId, searchQuery]);

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
    }

    const handleBulkMove = () => {
        const studentsToMove = students.filter(s => selectedStudentIds.includes(s.id));
        onMoveStudentBulkClick(studentsToMove);
    };

    const handleBulkEdit = () => {
        const studentsToEdit = students.filter(s => selectedStudentIds.includes(s.id));
        onEditStudentBulkClick(studentsToEdit);
    };

    const cancelSelectionMode = () => {
        setSelectedStudentIds([]);
        setIsSelectionMode(false);
    };

    // --- Touch Logic for Long Press ---
    const handleTouchStart = (studentId: string) => {
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
                    className="fixed inset-0 bg-black bg-opacity-40 z-20"
                    onClick={() => setIsFabOpen(false)}
                    aria-hidden="true"
                ></div>
            )}

            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end">
                    <ClassSelector
                        classes={classes}
                        selectedClassId={selectedClassId}
                        onSelectClass={onSelectClass}
                        className="w-full md:max-w-md"
                    />
                    <div className="relative w-full md:w-64">
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

                {/* Selection Actions Header (Desktop) / Floating Bottom Bar (Mobile) */}
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
                                <button onClick={handleBulkEdit} className="flex items-center text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-sm border border-slate-200 dark:border-slate-600">
                                    <PencilIcon className="mr-2 w-4 h-4" /> Editar
                                </button>
                                <button onClick={handleBulkMove} className="flex items-center text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-sm border border-slate-200 dark:border-slate-600">
                                    <SwitchHorizontalIcon className="mr-2 w-4 h-4" /> Mover
                                </button>
                                <button onClick={handleBulkMoveToBin} className="flex items-center text-sm bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors shadow-sm">
                                    <TrashIcon className="mr-2 w-4 h-4" /> Papelera
                                </button>
                            </div>
                        </div>

                        <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col gap-4 animate-slide-up">
                            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                                <span className="font-bold text-lg">{selectedStudentIds.length} seleccionados</span>
                                <button onClick={cancelSelectionMode} className="bg-slate-700 p-2 rounded-full hover:bg-slate-600">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex justify-between gap-2">
                                <button onClick={handleBulkEdit} className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-white/10">
                                    <PencilIcon className="w-6 h-6" />
                                    <span className="text-xs font-medium">Editar</span>
                                </button>
                                <button onClick={handleBulkMove} className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-white/10">
                                    <SwitchHorizontalIcon className="w-6 h-6" />
                                    <span className="text-xs font-medium">Mover</span>
                                </button>
                                <button onClick={handleBulkMoveToBin} className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-red-500/20 text-red-400">
                                    <TrashIcon className="w-6 h-6" />
                                    <span className="text-xs font-medium">Borrar</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Table for Desktop */}
                <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
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
                            {filteredStudents.map((student) => {
                                const isSelected = selectedStudentIds.includes(student.id);
                                return (
                                    <tr
                                        key={student.id}
                                        className={`transition-colors duration-150 ${isSelected
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                            }`}
                                    >
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 text-indigo-600 border-slate-300 dark:border-slate-500 rounded focus:ring-indigo-500 bg-white dark:bg-slate-600 cursor-pointer"
                                                checked={isSelected}
                                                onChange={() => handleSelectStudent(student.id)}
                                                aria-label={`Seleccionar a ${student.name}`}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center cursor-pointer" onClick={() => onViewProfile(student)}>
                                                <div className="flex-shrink-0 h-10 w-10 relative">
                                                    <Avatar
                                                        name={student.name}
                                                        src={student.avatar}
                                                        size="md"
                                                        className="border border-slate-200 dark:border-slate-600"
                                                    />
                                                    {student.orderNumber && (
                                                        <div className="absolute -top-1 -right-1 bg-slate-700 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white dark:border-slate-800">
                                                            {student.orderNumber}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className={`text-sm font-bold ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-slate-100'}`}>{student.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{student.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => onViewProfile(student)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1 rounded-lg transition-colors">Ver Perfil</button>
                                                <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-2"></div>
                                                <button onClick={() => onMoveStudentClick(student)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Mover">
                                                    <SwitchHorizontalIcon />
                                                </button>
                                                <button onClick={() => onEditStudentClick(student)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Editar">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onMoveToBinClick(student)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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
                                                    <button
                                                        onClick={() => onAddStudentClick(selectedClassId)}
                                                        className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                                    >
                                                        <PlusIcon className="w-5 h-5 mr-2" />
                                                        Añadir Estudiante
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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

                    {filteredStudents.map(student => {
                        const isSelected = selectedStudentIds.includes(student.id);
                        return (
                            <div
                                key={student.id}
                                className={`relative rounded-2xl shadow-sm p-4 transition-all duration-200 touch-manipulation ${isSelected
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500 dark:ring-indigo-400 transform scale-[0.98]'
                                    : 'bg-white dark:bg-slate-800 active:scale-[0.98]'
                                    }`}
                                onClick={() => handleStudentClick(student)}
                                onTouchStart={() => handleTouchStart(student.id)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onContextMenu={(e) => e.preventDefault()}
                            >
                                {isSelected && (
                                    <div className="absolute top-3 right-3 bg-indigo-500 text-white rounded-full p-1 shadow-sm animate-scale-in">
                                        <CheckIcon className="w-4 h-4" />
                                    </div>
                                )}

                                <div className="flex items-start gap-4 pointer-events-none">
                                    <div className="relative flex-shrink-0">
                                        <Avatar
                                            name={student.name}
                                            src={student.avatar}
                                            size="md"
                                            className="h-14 w-14 border-2 border-slate-100 dark:border-slate-700"
                                        />
                                        {student.orderNumber && (
                                            <div className="absolute -bottom-1 -right-1 bg-slate-700 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">
                                                {student.orderNumber}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <p className={`font-bold truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-slate-100'}`}>
                                            {student.name}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">ID: {student.id}</p>
                                    </div>
                                </div>

                                {!isSelectionMode && (
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Acciones</span>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => onEditStudentClick(student)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 active:bg-slate-100 dark:active:bg-slate-700 rounded-lg transition-colors">
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => onMoveStudentClick(student)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 active:bg-slate-100 dark:active:bg-slate-700 rounded-lg transition-colors">
                                                <SwitchHorizontalIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filteredStudents.length === 0 && (
                        <div className="col-span-1 sm:col-span-2 text-center py-12 px-4 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-dashed border-slate-200 dark:border-slate-700">
                            {searchQuery ? (
                                `No se encontraron estudiantes para "${searchQuery}".`
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <p>No hay estudiantes en esta clase.</p>
                                    {selectedClassId && (
                                        <button
                                            onClick={() => onAddStudentClick(selectedClassId)}
                                            className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                        >
                                            <PlusIcon className="w-5 h-5 mr-2" />
                                            Añadir Estudiante
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {!isSelectionMode && (
                <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end pointer-events-none">
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
                        <div className="flex items-center gap-3 group">
                            <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 transform transition-transform group-hover:-translate-x-1">Nueva Clase</span>
                            <button
                                onClick={() => { onAddClassClick(); setIsFabOpen(false); }}
                                className="bg-slate-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 p-3 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors shadow-lg border border-indigo-100 dark:border-slate-600"
                            >
                                <BookOpenIcon className="w-6 h-6" />
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
