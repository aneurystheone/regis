import React from 'react';
import type { EvaluationInstrument, Competency } from '../types';
import { XIcon, BoltIcon, PencilIcon, AcademicCapIcon } from './icons';

interface InstrumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  instrument: EvaluationInstrument | null;
  competencies: Competency[];
  onExpressGradingClick: (instrument: EvaluationInstrument) => void;
  onEditInstrumentClick: (instrument: EvaluationInstrument) => void;
}

export const InstrumentDetailModal: React.FC<InstrumentDetailModalProps> = ({ isOpen, onClose, instrument, competencies, onExpressGradingClick, onEditInstrumentClick }) => {

  if (!isOpen || !instrument) {
    return null;
  }

  const getCompetencyName = (id: string) => {
    return competencies.find(c => c.id === id)?.name || 'Competencia desconocida';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-2xl m-4 transform transition-all" role="document">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{instrument.name}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors" aria-label="Cerrar modal">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4 text-slate-700 dark:text-slate-300 max-h-[60vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Tipo</p>
                    <p className="font-medium">{instrument.type}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Puntos Totales</p>
                    <p className="font-medium">{instrument.totalPoints}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Fecha</p>
                    <p className="font-medium">{instrument.date}</p>
                </div>
            </div>

            {instrument.contenidos && (
                <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Contenidos</h3>
                    <p className="text-sm p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">{instrument.contenidos}</p>
                </div>
            )}

            {instrument.actividades && (
                <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Actividades</h3>
                    <p className="text-sm p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">{instrument.actividades}</p>
                </div>
            )}

            <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Competencias Evaluadas</h3>
                <div className="flex flex-wrap gap-2">
                    {instrument.competencyIds.map(id => (
                        <span key={id} className="flex items-center gap-1.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 text-xs font-medium px-2.5 py-1 rounded-full">
                            <AcademicCapIcon className="w-4 h-4" />
                            {getCompetencyName(id)}
                        </span>
                    ))}
                </div>
            </div>

             {instrument.criteria && instrument.criteria.length > 0 && (
                <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Criterios de Evaluación</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                        {instrument.criteria.map(c => <li key={c.id}>{c.text}</li>)}
                    </ul>
                </div>
            )}
        </div>

        <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onEditInstrumentClick(instrument)}
            className="flex items-center bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors"
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onExpressGradingClick(instrument)}
            className="flex items-center bg-yellow-400 text-yellow-900 font-semibold py-2 px-4 rounded-lg hover:bg-yellow-500 transition-colors shadow-sm"
          >
            <BoltIcon className="w-5 h-5 mr-2" />
            Calificación Rápida
          </button>
        </div>
      </div>
    </div>
  );
};
