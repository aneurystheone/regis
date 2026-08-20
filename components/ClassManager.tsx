import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Class, Student } from '../types';
import { TrashIcon, CheckIcon, XIcon, PencilIcon, EyeIcon, UserGroupIcon } from './icons';
import { filterStudentsByClass } from '../utils';

import { ClassLimitWarning } from './ClassLimitWarning';
import { useSubscription } from '../contexts/SubscriptionContext';
import { MONETIZATION_ENABLED } from '../config/phases';

interface ClassManagerProps {
    classes: Class[];
    students: Student[];
    onNavigateToClass: (classId: string) => void;
    onAddClass: () => void;
    onViewClassDetails: (cls: Class) => void;
    onDeleteClass: (cls: Class) => void;
    onBulkDeleteClasses: (classes: Class[]) => void; // New prop for bulk delete
    onNavigateToSettings?: () => void; // Navigate to settings for upgrade
}

export const ClassManager: React.FC<ClassManagerProps> = ({
    classes,
    students,
    onNavigateToClass,
    onAddClass,
    onViewClassDetails,
    onDeleteClass,
    onBulkDeleteClasses,
    onNavigateToSettings
}) => {
    const { isPremium, subscription, canCreateClass, getRemainingClasses } = useSubscription();
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const isSelectionMode = selectedClassIds.length > 0;
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    const canAddClass = canCreateClass(classes.length);
    const remaining = getRemainingClasses(classes.length);

    const handleTouchStart = (classId: string) => {
        if (isSelectionMode) return; // If already in selection mode, handle click/tap normally

        longPressTimerRef.current = setTimeout(() => {
            // Trigger selection mode
            setSelectedClassIds([classId]);
            // Vibrate if available
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500); // 500ms long press
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleClassClick = (cls: Class) => {
        if (isSelectionMode) {
            // Toggle selection
            if (selectedClassIds.includes(cls.id)) {
                const newSelected = selectedClassIds.filter(id => id !== cls.id);
                setSelectedClassIds(newSelected);
            } else {
                setSelectedClassIds([...selectedClassIds, cls.id]);
            }
        } else {
            // Navigate
            onNavigateToClass(cls.id);
        }
    };

    const handleCancelSelection = () => {
        setSelectedClassIds([]);
    };

    const handleBulkAction = (action: 'DELETE' | 'DETAILS') => {
        const selectedClasses = classes.filter(c => selectedClassIds.includes(c.id));

        if (action === 'DELETE') {
            if (selectedClasses.length === 1) {
                onDeleteClass(selectedClasses[0]);
            } else {
                onBulkDeleteClasses(selectedClasses);
            }
        } else if (action === 'DETAILS') {
            if (selectedClasses.length === 1) {
                onViewClassDetails(selectedClasses[0]);
            }
        }
        handleCancelSelection();
    };


    return (
        <div className="p-4 sm:p-8 space-y-6 pb-24 md:pb-8"> {/* Add padding bottom for mobile footer */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Mis Cursos</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={onAddClass}
                            disabled={!canAddClass}
                            className={`font-semibold py-2 px-4 rounded-lg transition-all ${canAddClass
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            Añadir Curso
                        </button>
                    </div>
                </div>

                {/* Class Limit Warning - Hidden in Phase 0 */}
                {MONETIZATION_ENABLED && (
                    <ClassLimitWarning
                        currentCount={classes.length}
                        isPremium={isPremium}
                        isGrandfathered={subscription.grandfathered || false}
                        onUpgradeClick={onNavigateToSettings}
                    />
                )}
            </div>

            <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 0 },
                    show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.1 }
                    }
                }}
            >
                {classes.map((cls, index) => {
                    const isSelected = selectedClassIds.includes(cls.id);
                    const studentCount = cls.groupId 
                        ? students.filter(s => s.groupId === cls.groupId).length
                        : students.filter(s => s.classId === cls.id).length;

                    return (
                        <motion.div
                            variants={{
                                hidden: { opacity: 0, scale: 0.9, y: 20 },
                                show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } }
                            }}
                            key={cls.id}
                            onClick={() => handleClassClick(cls)}
                            onTouchStart={() => handleTouchStart(cls.id)}
                            onTouchEnd={handleTouchEnd}
                            onTouchMove={handleTouchEnd} // Cancel on scroll
                            onContextMenu={(e) => e.preventDefault()} // Prevent context menu on long press
                            role="button"
                            tabIndex={0}
                            className={`relative group w-full text-left bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700/50 transition-all cursor-pointer overflow-hidden
                ${isSelected ? 'ring-4 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 transform scale-[0.98]' : 'hover:shadow-xl hover:-translate-y-1'}
              `}
                        >
                            {/* Color Bar Accent */}
                            <div className="absolute top-0 left-0 bottom-0 w-2" style={{ backgroundColor: cls.color }} />

                            {isSelected && (
                                <div className="absolute top-4 right-4 bg-indigo-500 text-white rounded-full p-1 shadow-md z-10">
                                    <CheckIcon className="w-5 h-5" />
                                </div>
                            )}

                            <div className="flex justify-between items-start pl-4">
                                <div>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <p className="font-black text-4xl text-slate-800 dark:text-slate-100 tracking-tight">
                                            {cls.grade.replace(' Grado', '').replace('ro','º').replace('do','º').replace('er','º').replace('to','º').replace('mo','º').replace('vo','º')}
                                        </p>
                                        <p className="font-black text-4xl text-indigo-500">{cls.section}</p>
                                    </div>
                                    <p className="font-bold text-lg text-slate-700 dark:text-slate-200 leading-tight mb-3">{cls.name}</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {cls.level && (
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                                {cls.level.replace('Nivel ', '')}
                                            </span>
                                        )}
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                            {cls.schoolYear}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col items-end gap-3 z-10">
                                    <div className="flex items-center gap-1.5 text-sm font-bold bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-800">
                                        <UserGroupIcon className="w-4 h-4" /> {studentCount}
                                    </div>
                                    
                                    {/* Mobile Detail Icon */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onViewClassDetails(cls); }} 
                                        className="md:hidden p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-600 transition-colors shadow-sm"
                                        aria-label="Ver detalles"
                                    >
                                        <EyeIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Desktop Hover Actions */}
                            <div className="hidden md:flex absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all items-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); onViewClassDetails(cls); }} className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all font-bold text-sm px-5 flex items-center gap-2">
                                    <EyeIcon className="w-4 h-4" />
                                    Detalles
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Mobile Selection Card */}
            {isSelectionMode && (
                <div className="md:hidden fixed bottom-6 left-4 right-4 z-[100] bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col gap-4 animate-slide-up">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                        <span className="font-bold text-lg">{selectedClassIds.length} seleccionados</span>
                        <button onClick={handleCancelSelection} className="bg-slate-700 p-2 rounded-full hover:bg-slate-600">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex justify-between gap-2">
                        {selectedClassIds.length === 1 && (
                            <button
                                onClick={() => handleBulkAction('DETAILS')}
                                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-white/10"
                            >
                                <EyeIcon className="w-6 h-6" />
                                <span className="text-xs font-medium">Detalles</span>
                            </button>
                        )}
                        {/* Eliminar moved out 
                        <button
                            onClick={() => handleBulkAction('DELETE')}
                            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-red-500/20 text-red-400"
                        >
                            <TrashIcon className="w-6 h-6" />
                            <span className="text-xs font-medium">Eliminar</span>
                        </button>
                        */}
                    </div>
                </div>
            )}

        </div>
    );
};
