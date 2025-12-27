import React, { useState, useEffect, useMemo } from 'react';
import type { Class, Competency, EvaluationInstrument, EvaluationPeriod, InstrumentType, Criterion } from '../types';
import { PlusIcon, XIcon, SparklesIcon, TrashIcon } from './icons';
import { generateEvaluationCriteria } from '../services/geminiService';

const instrumentTypes: InstrumentType[] = ['Prueba Corta', 'Examen', 'Tarea', 'Proyecto', 'Observación', 'Lista de Cotejo', 'Escala Estimativa', 'Rúbrica'];
const evaluationPeriods: EvaluationPeriod[] = ['P1', 'P2', 'P3', 'P4'];

interface AddInstrumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddInstrument: (instrument: Omit<EvaluationInstrument, 'id'>) => void;
  classes: Class[];
  competencies: Competency[];
}

export const AddInstrumentModal: React.FC<AddInstrumentModalProps> = ({ isOpen, onClose, onAddInstrument, classes, competencies }) => {
  const [classId, setClassId] = useState<string>(classes[0]?.id || '');
  const [name, setName] = useState('');
  const [type, setType] = useState<InstrumentType>('Prueba Corta');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalPoints, setTotalPoints] = useState<number>(100);
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<string[]>([]);
  const [period, setPeriod] = useState<EvaluationPeriod>('P1');
  const [contenidos, setContenidos] = useState('');
  const [actividades, setActividades] = useState('');
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableCompetencies = useMemo(() => competencies.filter(c => c.classId === classId), [competencies, classId]);
  const showCriteriaSection = ['Lista de Cotejo', 'Escala Estimativa', 'Rúbrica'].includes(type);

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setClassId(classes[0]?.id || '');
      setName('');
      setType('Prueba Corta');
      setDate(new Date().toISOString().split('T')[0]);
      setTotalPoints(100);
      setSelectedCompetencyIds([]);
      setPeriod('P1');
      setContenidos('');
      setActividades('');
      setCriteria([]);
    }
  }, [isOpen, classes]);

  useEffect(() => setSelectedCompetencyIds([]), [classId]);
  
  const handleAddCriterion = () => setCriteria(prev => [...prev, { id: `C${Date.now()}`, text: '' }]);
  const handleCriterionChange = (id: string, text: string) => setCriteria(prev => prev.map(c => c.id === id ? { ...c, text } : c));
  const handleRemoveCriterion = (id: string) => setCriteria(prev => prev.filter(c => c.id !== id));

  const handleGenerateCriteria = async () => {
    const selectedCompetencies = competencies.filter(c => selectedCompetencyIds.includes(c.id));
    if (selectedCompetencies.length === 0 || !contenidos) {
      alert("Por favor, seleccione al menos una competencia y añada contenidos para generar criterios.");
      return;
    }
    setIsGenerating(true);
    const results = await generateEvaluationCriteria(selectedCompetencies, contenidos, type);
    if (results.length > 0) {
        setCriteria(results.map(text => ({ id: `C${Date.now()}${Math.random()}`, text })));
    } else {
        alert("La IA no pudo generar criterios. Por favor, inténtelo de nuevo o añádalos manualmente.");
    }
    setIsGenerating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && classId) {
      onAddInstrument({
        classId, name, type, date, totalPoints,
        competencyIds: selectedCompetencyIds,
        period, contenidos, actividades,
        criteria: showCriteriaSection ? criteria.filter(c => c.text.trim() !== '') : undefined,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  const inputStyles = "w-full px-3 py-2 text-base border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-3xl m-4 transform transition-all" role="document">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Añadir Instrumento de Evaluación</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors" aria-label="Cerrar modal">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
          {/* Main Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Fields for class, name, type, date, points, period */}
             <div>
              <label htmlFor="inst-class" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Clase</label>
              <select id="inst-class" value={classId} onChange={e => setClassId(e.target.value)} className={inputStyles} required>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.schoolYear})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="inst-name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre</label>
              <input id="inst-name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputStyles} required />
            </div>
             <div>
              <label htmlFor="inst-type" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Tipo</label>
              <select id="inst-type" value={type} onChange={e => setType(e.target.value as any)} className={inputStyles} required>
                {instrumentTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="inst-date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Fecha</label>
              <input id="inst-date" type="date" value={date} onChange={e => setDate(e.target.value)} className={inputStyles} required />
            </div>
             <div>
              <label htmlFor="inst-points" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Puntos Totales</label>
              <input id="inst-points" type="number" value={totalPoints} onChange={e => setTotalPoints(Number(e.target.value))} className={inputStyles} required min="0" />
            </div>
             <div>
              <label htmlFor="inst-period" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Período</label>
              <select id="inst-period" value={period} onChange={e => setPeriod(e.target.value as any)} className={inputStyles} required>
                {evaluationPeriods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
           {/* Contenidos y Actividades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label htmlFor="inst-contenidos" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Contenidos</label>
                <textarea id="inst-contenidos" value={contenidos} onChange={e => setContenidos(e.target.value)} className={inputStyles} rows={2} />
              </div>
              <div>
                <label htmlFor="inst-actividades" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Actividades</label>
                <textarea id="inst-actividades" value={actividades} onChange={e => setActividades(e.target.value)} className={inputStyles} rows={2} />
              </div>
          </div>
          {/* Competencies */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Vincular a Competencias</label>
            <div className="max-h-32 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-md p-2 space-y-2">
              {availableCompetencies.map(c => (
                <div key={c.id} className="flex items-center">
                  <input type="checkbox" id={`add-comp-${c.id}`} checked={selectedCompetencyIds.includes(c.id)} onChange={() => setSelectedCompetencyIds(p => p.includes(c.id) ? p.filter(id => id !== c.id) : [...p, c.id])}
                    className="h-4 w-4 bg-slate-100 dark:bg-slate-700 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 dark:focus:ring-offset-slate-800" />
                  <label htmlFor={`add-comp-${c.id}`} className="ml-3 block text-sm text-slate-700 dark:text-slate-300">{c.name}</label>
                </div>
              ))}
            </div>
          </div>
           {/* Criteria Section */}
          {showCriteriaSection && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Criterios de Evaluación</label>
                    <button type="button" onClick={handleGenerateCriteria} disabled={isGenerating || selectedCompetencyIds.length === 0 || !contenidos}
                        className="flex items-center text-sm bg-teal-500 text-white font-semibold py-1 px-3 rounded-lg hover:bg-teal-600 transition-colors shadow-sm disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed">
                        <SparklesIcon className="w-4 h-4 mr-2" />
                        {isGenerating ? 'Generando...' : 'Generar con IA'}
                    </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {criteria.map((criterion, index) => (
                        <div key={criterion.id} className="flex items-center gap-2">
                           <span className="text-sm font-semibold text-slate-500">{index + 1}.</span>
                           <input type="text" value={criterion.text} onChange={e => handleCriterionChange(criterion.id, e.target.value)} className={`${inputStyles} text-sm`} placeholder="Descripción del criterio..." />
                           <button type="button" onClick={() => handleRemoveCriterion(criterion.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                               <TrashIcon className="w-4 h-4" />
                           </button>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={handleAddCriterion} className="text-sm mt-2 flex items-center text-indigo-600 hover:text-indigo-800 font-semibold">
                    <PlusIcon className="w-4 h-4 mr-1" /> Añadir Criterio Manualmente
                </button>
            </div>
          )}
          <div className="flex justify-end gap-4 pt-6">
            <button type="button" onClick={onClose} className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors">Cancelar</button>
            <button type="submit" className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:bg-slate-400" disabled={!name.trim()}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Añadir Instrumento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
