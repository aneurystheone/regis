import React, { useState, useEffect, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Student, WorkTeam, Class } from '../types';
import { api } from '../services/api';
import { PlusIcon, TrashIcon, XIcon, PencilIcon } from './icons';
import { Avatar } from './Avatar';
import { useConfirm } from '../contexts/ConfirmationContext';

interface TeamBoardProps {
    students: Student[];
    currentClass: Class | undefined;
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// ----------------------
// Student Card (Visual)
// ----------------------
const StudentCard = ({ student, isOverlay }: { student: Student, isOverlay?: boolean }) => (
    <div
        className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${isOverlay ? 'shadow-2xl ring-2 ring-indigo-500 scale-105 z-50' : ''}`}
    >
        <Avatar name={student.name} src={student.avatar} size="sm" />
        <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{student.name}</p>
        </div>
    </div>
);

// ----------------------
// Sortable Student Item
// ----------------------
const SortableStudentCard = ({ student }: { student: Student }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: student.id, data: { type: 'Student', student } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <StudentCard student={student} />
        </div>
    );
};

// ----------------------
// Team Column
// ----------------------
const TeamColumn = ({ team, teamStudents, onEdit, onDelete }: { team: WorkTeam, teamStudents: Student[], onEdit: () => void, onDelete: () => void }) => {
    const { setNodeRef } = useSortable({
        id: team.id,
        data: { type: 'Team', team },
    });

    return (
        <div className="flex flex-col flex-shrink-0 w-80 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden h-[calc(100vh-250px)]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || '#6366f1' }}></div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{team.name}</h3>
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium px-2 py-0.5 rounded-full">
                        {teamStudents.length}
                    </span>
                </div>
                <div className="flex gap-1">
                    <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div ref={setNodeRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                <SortableContext items={teamStudents.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {teamStudents.map(student => (
                        <SortableStudentCard key={student.id} student={student} />
                    ))}
                    {teamStudents.length === 0 && (
                        <div className="h-full flex items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">Arrastra estudiantes aquí</p>
                        </div>
                    )}
                </SortableContext>
            </div>
        </div>
    );
};

// ----------------------
// Main Board
// ----------------------
export const TeamBoard: React.FC<TeamBoardProps> = ({ students, currentClass, addToast }) => {
    const [teams, setTeams] = useState<WorkTeam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeStudent, setActiveStudent] = useState<Student | null>(null);
    const confirm = useConfirm();

    // Modals
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<WorkTeam | null>(null);
    const [teamForm, setTeamForm] = useState({ name: '', color: '#6366f1' });

    useEffect(() => {
        const unsubscribe = api.subscribeToTeams((data) => {
            setTeams(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Filtrar equipos relevantes para este curso o grupo
    const classTeams = useMemo(() => {
        if (!currentClass) return [];
        return teams.filter(t => {
            if (currentClass.groupId && t.groupId === currentClass.groupId) return true;
            return t.classId === currentClass.id;
        });
    }, [teams, currentClass]);

    const unassignedStudents = useMemo(() => {
        const assignedIds = new Set(classTeams.flatMap(t => t.studentIds));
        return students.filter(s => !assignedIds.has(s.id));
    }, [students, classTeams]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const student = students.find(s => s.id === active.id);
        if (student) setActiveStudent(student);
    };

    const handleDragOver = (event: DragOverEvent) => {
        if (!event.over) return;
        // Visual logic can be added here if needed
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveStudent(null);
        const { active, over } = event;
        if (!over) return;

        const studentId = active.id as string;
        const targetId = over.id as string; // Could be a student ID or a Team ID
        const student = students.find(s => s.id === studentId);
        
        if (!student) return;

        // Determine source team
        const sourceTeam = classTeams.find(t => t.studentIds.includes(studentId));
        
        // Determine target team
        let targetTeam = classTeams.find(t => t.id === targetId);
        if (!targetTeam) {
            // Target might be a student inside a team
            targetTeam = classTeams.find(t => t.studentIds.includes(targetId));
        }

        // Target might be the "unassigned" column (id="unassigned")
        const isTargetUnassigned = targetId === 'unassigned' || unassignedStudents.some(s => s.id === targetId);

        if (sourceTeam === targetTeam && !isTargetUnassigned) {
            // Moving within the same team (reordering) - optional, we'll skip for simplicity
            return;
        }

        if (sourceTeam?.id === targetTeam?.id) return; // Unassigned to Unassigned

        // Optimistic Update
        let updatedTeams = [...teams];

        // 1. Remove from source
        if (sourceTeam) {
            updatedTeams = updatedTeams.map(t => 
                t.id === sourceTeam.id 
                    ? { ...t, studentIds: t.studentIds.filter(id => id !== studentId) } 
                    : t
            );
        }

        // 2. Add to target
        if (targetTeam) {
            updatedTeams = updatedTeams.map(t => 
                t.id === targetTeam.id 
                    ? { ...t, studentIds: [...t.studentIds, studentId] } 
                    : t
            );
        }

        setTeams(updatedTeams);

        // API Calls
        try {
            if (sourceTeam) {
                await api.removeStudentFromTeam(sourceTeam.id, studentId);
            }
            if (targetTeam) {
                await api.addStudentToTeam(targetTeam.id, studentId);
            }
        } catch (error) {
            addToast('Error al actualizar el equipo', 'error');
            // Revert would happen naturally on next subscription pulse if failed
        }
    };

    const handleSaveTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentClass) return;

        try {
            if (editingTeam) {
                await api.updateTeam(editingTeam.id, { name: teamForm.name, color: teamForm.color });
                addToast('Equipo actualizado', 'success');
            } else {
                await api.addTeam({
                    name: teamForm.name,
                    color: teamForm.color,
                    classId: currentClass.id,
                    groupId: currentClass.groupId,
                    studentIds: []
                });
                addToast('Equipo creado', 'success');
            }
            setIsTeamModalOpen(false);
            setTeamForm({ name: '', color: '#6366f1' });
            setEditingTeam(null);
        } catch (err) {
            addToast('Error al guardar el equipo', 'error');
        }
    };

    const handleDeleteTeam = async (team: WorkTeam) => {
        if (await confirm({
            title: 'Eliminar Equipo',
            message: `¿Estás seguro de que deseas eliminar el equipo "${team.name}"? Los estudiantes volverán a la lista de no asignados.`,
            confirmText: 'Eliminar',
            type: 'danger'
        })) {
            try {
                await api.deleteTeam(team.id);
                addToast('Equipo eliminado', 'success');
            } catch (err) {
                addToast('Error al eliminar', 'error');
            }
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando equipos...</div>;

    if (!currentClass) return <div className="p-8 text-center text-slate-500">Selecciona un curso para gestionar equipos</div>;

    return (
        <div className="flex flex-col h-full animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Equipos de Trabajo</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Organiza a los estudiantes en grupos para proyectos o actividades.</p>
                </div>
                <button 
                    onClick={() => { setEditingTeam(null); setTeamForm({ name: '', color: '#6366f1' }); setIsTeamModalOpen(true); }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    Nuevo Equipo
                </button>
            </div>

            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragStart={handleDragStart}
                onDragOver={handleDragOver} 
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveStudent(null)}
            >
                <div className="flex overflow-x-auto gap-6 pb-6 pt-2 h-full">
                    
                    {/* Unassigned Students Column */}
                    <div className="flex flex-col flex-shrink-0 w-80 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden h-[calc(100vh-250px)]">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center sticky top-0 z-10">
                            <h3 className="font-bold text-slate-900 dark:text-white">Sin asignar</h3>
                            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium px-2 py-0.5 rounded-full">
                                {unassignedStudents.length}
                            </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            <SortableContext id="unassigned" items={unassignedStudents.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                {unassignedStudents.map(student => (
                                    <SortableStudentCard key={student.id} student={student} />
                                ))}
                                {unassignedStudents.length === 0 && (
                                    <div className="h-full flex items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">Todos están asignados</p>
                                    </div>
                                )}
                            </SortableContext>
                        </div>
                    </div>

                    {/* Team Columns */}
                    {classTeams.map(team => (
                        <TeamColumn 
                            key={team.id} 
                            team={team} 
                            teamStudents={students.filter(s => team.studentIds.includes(s.id))}
                            onEdit={() => { setEditingTeam(team); setTeamForm({ name: team.name, color: team.color || '#6366f1' }); setIsTeamModalOpen(true); }}
                            onDelete={() => handleDeleteTeam(team)}
                        />
                    ))}

                </div>

                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }) }}>
                    {activeStudent ? <StudentCard student={activeStudent} isOverlay /> : null}
                </DragOverlay>
            </DndContext>

            {/* Team Modal */}
            {isTeamModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}
                            </h2>
                            <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:bg-slate-100 hover:text-slate-600 p-2 rounded-full transition-colors dark:hover:bg-slate-700 dark:hover:text-slate-300">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveTeam} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nombre del equipo</label>
                                <input
                                    type="text"
                                    value={teamForm.name}
                                    onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                                    required
                                    autoFocus
                                    placeholder="Ej. Los Leones"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Color identificador</label>
                                <div className="flex gap-2">
                                    {['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setTeamForm({ ...teamForm, color: c })}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform ${teamForm.color === c ? 'scale-110 border-slate-900 dark:border-white shadow-md' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsTeamModalOpen(false)} className="px-5 py-2.5 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-5 py-2.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
