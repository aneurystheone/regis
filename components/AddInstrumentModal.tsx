import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Class, Competency, EvaluationInstrument, EvaluationPeriod, InstrumentType, Criterion, AIFeatures, FundamentalCompetency } from '../types';
import { PlusIcon, XIcon, SparklesIcon, TrashIcon, BookOpenIcon, ClipboardCheckIcon } from './icons';
import { generateEvaluationCriteria } from '../services/geminiService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { getCurrentEvaluationPeriod } from '../utils';
import { useCanUseAI } from '../contexts/SubscriptionContext';
import { generateWildcardCompetencies } from '../services/gradeHelpers';
import { useAlert } from '../contexts/ConfirmationContext';

const instrumentTypes: InstrumentType[] = [
  'Prueba Corta',
  'Examen',
  'Tarea',
  'Participación',
  'Proyecto',
  'Lista de Cotejo'
];
const evaluationPeriods: EvaluationPeriod[] = ['P1', 'P2', 'P3', 'P4'];

const TOTAL_STEPS = 3;
const STEP_LABELS = ['Identificación', 'Currículo', 'Criterios'];

interface AddInstrumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddInstrument: (instrument: Omit<EvaluationInstrument, 'id'>, classIds: string[]) => void;
  classes: Class[];
  competencies: Competency[];
  fundamentalCompetencies: FundamentalCompetency[];
  aiFeatures: AIFeatures;
  selectedClassId?: string | null;
  initialPeriod?: EvaluationPeriod;
  initialCompetencyIds?: string[];
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------
const Stepper: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center justify-center gap-0 select-none">
    {STEP_LABELS.map((label, i) => {
      const step = i + 1;
      const isComplete = step < current;
      const isActive = step === current;
      return (
        <React.Fragment key={step}>
          {/* Node */}
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${isComplete
                ? 'bg-blue-600 border-blue-600 text-white'
                : isActive
                  ? 'bg-white dark:bg-slate-800 border-blue-600 text-blue-600'
                  : 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500'
                }`}
            >
              {isComplete ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step
              )}
            </div>
            <span
              className={`text-[10px] font-semibold tracking-wide uppercase transition-colors duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'
                }`}
            >
              {label}
            </span>
          </div>

          {/* Connector */}
          {i < TOTAL_STEPS - 1 && (
            <div className="w-8 h-0.5 mb-3 mx-1 transition-all duration-500 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500 rounded-full"
                style={{ width: isComplete ? '100%' : '0%' }}
              />
            </div>
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export const AddInstrumentModal: React.FC<AddInstrumentModalProps> = ({
  isOpen,
  onClose,
  onAddInstrument,
  classes,
  competencies,
  fundamentalCompetencies,
  aiFeatures,
  selectedClassId,
  initialPeriod,
  initialCompetencyIds
}) => {
  const canUseCriteria = useCanUseAI('criteriaGeneration');

  // Form state
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([selectedClassId || classes[0]?.id || '']);
  const [name, setName] = useState('');
  const [type, setType] = useState<InstrumentType>('Prueba Corta');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalPoints, setTotalPoints] = useState<number>(100);
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<string[]>([]);
  const [period, setPeriod] = useState<EvaluationPeriod>(getCurrentEvaluationPeriod());
  const [contenidos, setContenidos] = useState('');
  const [actividades, setActividades] = useState('');
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isDirty = useMemo(() => {
    return name.trim() !== '' ||
      contenidos.trim() !== '' ||
      actividades.trim() !== '' ||
      criteria.length > 0 ||
      selectedCompetencyIds.length !== (initialCompetencyIds?.length || 0);
  }, [name, contenidos, actividades, criteria, selectedCompetencyIds, initialCompetencyIds]);

  const handleSafeClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  const [step, setStep] = useState(1);
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && step === 1) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, step]);

  const availableCompetencies = useMemo(() => {
    const primaryClassId = selectedClassIds[0];
    if (!primaryClassId) return [];

    const specificCompetencies = competencies.filter(c => c.classId === primaryClassId);
    if (specificCompetencies.length === 0) {
      const currentClass = classes.find(c => c.id === primaryClassId);
      return generateWildcardCompetencies(primaryClassId, currentClass?.level);
    }
    return specificCompetencies;
  }, [competencies, selectedClassIds, classes]);

  const compatibleClasses = useMemo(() => {
    const primaryClass = classes.find(c => c.id === (selectedClassId || classes[0]?.id));
    if (!primaryClass) return [];
    return classes.filter(c =>
      c.name === primaryClass.name &&
      c.level === primaryClass.level &&
      c.schoolYear === primaryClass.schoolYear
    );
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (isOpen) {
      setSelectedClassIds([selectedClassId || classes[0]?.id || '']);
      if (initialPeriod) setPeriod(initialPeriod);
      if (initialCompetencyIds) setSelectedCompetencyIds(initialCompetencyIds);
    } else {
      setName('');
      setType('Prueba Corta');
      setDate(new Date().toISOString().split('T')[0]);
      setTotalPoints(100);
      setSelectedCompetencyIds([]);
      setPeriod(getCurrentEvaluationPeriod());
      setContenidos('');
      setActividades('');
      setCriteria([]);
      setStep(1);
    }
  }, [isOpen, classes, selectedClassId, initialPeriod, initialCompetencyIds]);

  useEffect(() => setSelectedCompetencyIds([]), [selectedClassIds]);

  // Criterion handlers
  const handleAddCriterion = () => setCriteria(prev => [...prev, { id: `C${Date.now()}`, text: '' }]);
  const handleCriterionChange = (id: string, text: string, maxPoints?: number) =>
    setCriteria(prev => prev.map(c => (c.id === id ? { ...c, text, ...(maxPoints !== undefined ? { maxPoints } : {}) } : c)));
  const handleRemoveCriterion = (id: string) => setCriteria(prev => prev.filter(c => c.id !== id));

  const handleGenerateCriteria = async () => {
    const selectedCompetencies = competencies.filter(c => selectedCompetencyIds.includes(c.id));
    if (selectedCompetencies.length === 0 || !contenidos) {
      await alert({ title: 'Atención', message: 'Por favor, seleccione al menos una competencia y añada contenidos para generar criterios.', type: 'warning' });
      return;
    }
    setIsGenerating(true);
    const results = await generateEvaluationCriteria(selectedCompetencies, contenidos, type);
    if (results.length > 0) {
      setCriteria(results.map(text => ({ id: `C${Date.now()}${Math.random()}`, text })));
    } else {
      await alert({ title: 'Error', message: 'La IA no pudo generar criterios. Por favor, inténtelo de nuevo o añádalos manualmente.', type: 'danger' });
    }
    setIsGenerating(false);
  };

  // Navigation
  const handleNext = () => {
    if (step === 1 && (!name.trim() || selectedClassIds.length === 0)) return;
    setSlideDir('right');
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setSlideDir('left');
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = () => {
    if (name.trim() && selectedClassIds.length > 0) {
      const finalCompetencyIds = selectedCompetencyIds.length > 0
        ? selectedCompetencyIds
        : availableCompetencies.map(c => c.id);

      const finalCriteria = criteria.filter(c => c.text.trim() !== '');

      const criteriaSum = finalCriteria.length > 0 && finalCriteria.every(c => c.maxPoints !== undefined)
        ? finalCriteria.reduce((s, c) => s + (c.maxPoints ?? 0), 0)
        : null;

      onAddInstrument({
        classId: selectedClassIds[0],
        name,
        type,
        date,
        totalPoints: criteriaSum !== null ? criteriaSum : totalPoints,
        competencyIds: finalCompetencyIds,
        period,
        contenidos,
        actividades,
        criteria: finalCriteria,
      }, selectedClassIds);
      onClose();
    }
  };

  const inputStyles =
    'w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 focus:ring-blue-600 focus:border-blue-600 transition-all text-sm';
  const labelStyles = 'text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1';
  const slideClass = 'transition-all duration-300';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
          <motion.div
            key="add-instrument-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleSafeClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            key="add-instrument-card"
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-800 w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative z-10"
            role="dialog"
            aria-modal="true"
          >
        {/* HEADER */}
        <header className="flex items-start justify-between px-6 py-3.5 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-2">
              <BookOpenIcon className="w-5 h-5 text-blue-600 shrink-0" />
              Nuevo Instrumento
            </h2>
            <Stepper current={step} />
          </div>
          <button
            onClick={handleSafeClose}
            aria-label="Cerrar"
            className="ml-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400 shrink-0"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </header>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 max-h-[calc(100vh-180px)]">
          {/* ── STEP 1: Identificación ── */}
          {step === 1 && (
            <div className={`space-y-3.5 ${slideClass}`}>
              <div className="flex flex-col">
                <label className={labelStyles} htmlFor="inst-name">Nombre del Instrumento</label>
                <input
                  id="inst-name"
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: Evaluación de Fracciones"
                  className={inputStyles}
                  required
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex flex-col">
                  <label className={labelStyles} htmlFor="inst-type">Tipo</label>
                  <select
                    id="inst-type"
                    value={type}
                    onChange={e => setType(e.target.value as InstrumentType)}
                    className={inputStyles}
                    required
                  >
                    {instrumentTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className={labelStyles} htmlFor="inst-period">Periodo</label>
                  <select
                    id="inst-period"
                    value={period}
                    onChange={e => setPeriod(e.target.value as EvaluationPeriod)}
                    className={inputStyles}
                    required
                  >
                    {evaluationPeriods.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className={labelStyles} htmlFor="inst-points">Puntos Totales</label>
                  <input
                    id="inst-points"
                    type="number"
                    value={totalPoints}
                    onChange={e => setTotalPoints(Number(e.target.value))}
                    placeholder="0"
                    className={inputStyles}
                    required
                    min="0"
                  />
                </div>
                <div className="flex flex-col">
                  <label className={labelStyles} htmlFor="inst-date">Fecha de Aplicación</label>
                  <div
                    onClick={() => dateInputRef.current?.showPicker()}
                    className="relative flex items-center cursor-pointer group"
                  >
                    <input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={date ? new Date(date + 'T00:00:00').toLocaleDateString() : ''}
                      className={`${inputStyles} pr-10 cursor-pointer select-none pointer-events-none`}
                    />
                    <input
                      id="inst-date"
                      ref={dateInputRef}
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="sr-only"
                      required
                    />
                    <div className="absolute right-2 p-1 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 pointer-events-none">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {compatibleClasses.length > 0 && (
                <div className="flex flex-col pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`${labelStyles} !mb-0`}>¿Desea compartir con otras secciones?</label>
                    {selectedClassIds.length > 1 && (
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                        <SparklesIcon className="w-3 h-3" />
                        {selectedClassIds.length} secciones sincronizadas
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-0.5 scroll-smooth">
                    {compatibleClasses.map(c => {
                      const isSelected = selectedClassIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setSelectedClassIds(p =>
                              p.includes(c.id)
                                ? (p.length > 1 ? p.filter(id => id !== c.id) : p)
                                : [...p, c.id]
                            )
                          }
                          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap select-none ${isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600'
                            }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                          {c.grade.replace(' Grado', '')} {c.section} - {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Currículo ── */}
          {step === 2 && (
            <div className={`space-y-3.5 ${slideClass}`}>
              <div className="flex flex-col">
                <label className={labelStyles} htmlFor="inst-contenidos">Contenidos Curriculares</label>
                <textarea
                  id="inst-contenidos"
                  value={contenidos}
                  onChange={e => setContenidos(e.target.value)}
                  placeholder="Describa los temas a evaluar..."
                  className={`${inputStyles} resize-none`}
                  rows={2}
                />
              </div>

              <div className="flex flex-col">
                <label className={labelStyles} htmlFor="inst-actividades">Actividades</label>
                <textarea
                  id="inst-actividades"
                  value={actividades}
                  onChange={e => setActividades(e.target.value)}
                  placeholder="Describa la metodología o actividades..."
                  className={`${inputStyles} resize-none`}
                  rows={2}
                />
              </div>

              <div className="flex flex-col">
                <label className={`${labelStyles} mb-1.5`}>Competencias a Desarrollar</label>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700/50 rounded-xl max-h-28 overflow-y-auto custom-scrollbar">
                  {availableCompetencies.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setSelectedCompetencyIds(p =>
                          p.includes(c.id) ? p.filter(id => id !== c.id) : [...p, c.id]
                        )
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border transition-all ${selectedCompetencyIds.includes(c.id)
                        ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600'
                        }`}
                    >
                      {c.name}
                      {selectedCompetencyIds.includes(c.id) && (
                        <span className="ml-0.5 hover:text-blue-900">
                          <XIcon className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  ))}
                  {availableCompetencies.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No hay competencias disponibles.</p>
                  )}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-gray-400 text-[10px] font-medium rounded-full border border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all"
                  >
                    <PlusIcon className="w-3 h-3" />
                    Añadir competencia
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Criterios ── */}
          {step === 3 && (
            <div className={`space-y-3.5 ${slideClass}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <ClipboardCheckIcon className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                  <h3 className="font-bold text-blue-900 dark:text-blue-400 uppercase tracking-wider text-xs">
                    Criterios de evaluación de {name || 'nuevo instrumento'}
                  </h3>
                </div>
                {canUseCriteria && (
                  <button
                    type="button"
                    onClick={handleGenerateCriteria}
                    disabled={isGenerating || selectedCompetencyIds.length === 0 || !contenidos}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-200 dark:border-indigo-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SparklesIcon className={`w-3.5 h-3.5 ${isGenerating ? 'animate-pulse' : ''}`} />
                    {isGenerating ? 'Vicente está pensando...' : 'Sugerir con Vicente'}
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {criteria.map((criterion, index) => (
                  <div key={criterion.id} className="flex gap-2 group animate-in slide-in-from-top-1 duration-200">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={criterion.text}
                        onChange={e => handleCriterionChange(criterion.id, e.target.value)}
                        placeholder={`Ej: Criterio ${index + 1}`}
                        className={inputStyles}
                      />
                    </div>
                    <div className="w-20 flex-shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={totalPoints}
                        value={criterion.maxPoints ?? ''}
                        onChange={e => handleCriterionChange(criterion.id, criterion.text, e.target.value === '' ? undefined : Number(e.target.value))}
                        placeholder={criteria.length > 0 ? String(Math.round(totalPoints / criteria.length)) : '0'}
                        title="Puntos máximos para este criterio"
                        className={`${inputStyles} text-center px-2`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCriterion(criterion.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-100 sm:opacity-0 group-hover:opacity-100"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {criteria.length > 0 && (
                  <div className="flex justify-end items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pr-8">
                    <span>Total asignado:</span>
                    <span className={`font-bold ${criteria.reduce((s, c) => s + (c.maxPoints ?? 0), 0) > totalPoints
                      ? 'text-red-500'
                      : criteria.reduce((s, c) => s + (c.maxPoints ?? 0), 0) === totalPoints
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400'
                      }`}>
                      {criteria.reduce((s, c) => s + (c.maxPoints ?? 0), 0)} / {totalPoints} pts
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddCriterion}
                  className="w-full py-2 border-2 border-dashed border-gray-100 dark:border-slate-700 rounded-xl text-gray-500 dark:text-slate-400 text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:border-blue-300 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Añadir Criterio
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="px-6 py-3 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 grid grid-cols-2 gap-3 shrink-0 z-10">
          {/* Left button: Cancel on step 1, Back from step 2+ */}
          {step === 1 ? (
            <button
              type="button"
              onClick={handleSafeClose}
              className="px-5 py-2.5 rounded-xl border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-400 font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-400 font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Atrás
            </button>
          )}

          {/* Right button: Next on steps 1-2, Submit on step 3 */}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={step === 1 && (!name.trim() || selectedClassIds.length === 0)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-sm"
            >
              Siguiente
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-sm"
            >
              Guardar Instrumento
            </button>
          )}
        </footer>
      </motion.div>

      <ConfirmDeleteModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleConfirmDiscard}
        title="Descartar cambios"
        message="¿Desea salir sin guardar el instrumento? Los cambios se perderán."
        confirmButtonText="Descartar"
      />
        </div>
      )}
    </AnimatePresence>
  );
};
