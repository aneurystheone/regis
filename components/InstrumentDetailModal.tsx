import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { EvaluationInstrument, Competency } from '../types';
import { XIcon, BoltIcon, PencilIcon, TrashIcon } from './icons';
import { useConfirm } from '../contexts/ConfirmationContext';

interface InstrumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  instrument: EvaluationInstrument | null;
  competencies: Competency[];
  fundamentalCompetencies: import('../types').FundamentalCompetency[];
  onExpressGradingClick: (instrument: EvaluationInstrument) => void;
  onEditInstrumentClick: (instrument: EvaluationInstrument) => void;
  onDeleteInstrument?: (instrumentId: string) => void;
}

export const InstrumentDetailModal: React.FC<InstrumentDetailModalProps> = ({
  isOpen, onClose, instrument, competencies, fundamentalCompetencies, onExpressGradingClick, onEditInstrumentClick, onDeleteInstrument
}) => {
  const confirm = useConfirm();

  const linkedCompetencyNames = React.useMemo(() => {
    if (!instrument) return [];
    const names: string[] = [];
    instrument.competencyIds.forEach(id => {
      const specific = competencies.find(c => c.id === id);
      if (specific) {
        const fund = fundamentalCompetencies.find(fc => fc.id === specific.fundamentalId);
        const label = fund
          ? `${specific.name} (${fund.name.split(' ').slice(0, 2).join(' ')})`
          : specific.name;
        names.push(label);
        return;
      }
      const direct = fundamentalCompetencies.find(fc => fc.id === id);
      if (direct) names.push(direct.name);
    });
    return names;
  }, [instrument, competencies, fundamentalCompetencies]);

  return (
    <AnimatePresence>
      {isOpen && instrument && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-neutral-50 dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-7 pt-7 pb-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{instrument.name}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Cerrar modal"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-7 pb-2 space-y-5 max-h-[60vh] overflow-y-auto">

              {/* Info chips row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Tipo', value: instrument.type },
                  { label: 'Puntos Totales', value: String(instrument.totalPoints) },
                  { label: 'Fecha', value: instrument.date },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-3 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-1">{label}</p>
                    <p className="text-slate-800 dark:text-white font-semibold text-sm">{value}</p>
                  </div>
                ))}
              </div>

              {/* Contenidos */}
              {instrument.contenidos && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Contenidos</h3>
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                    <p className="text-slate-700 dark:text-slate-300 text-sm">{instrument.contenidos}</p>
                  </div>
                </div>
              )}

              {/* Actividades */}
              {instrument.actividades && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Actividades</h3>
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                    <p className="text-slate-700 dark:text-slate-300 text-sm">{instrument.actividades}</p>
                  </div>
                </div>
              )}

              {/* Competencias Evaluadas */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Competencias Evaluadas</h3>
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 min-h-[48px] shadow-sm">
                  {linkedCompetencyNames.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {linkedCompetencyNames.map((name, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm px-3 py-1.5 rounded-xl"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm italic">No hay competencias vinculadas.</p>
                  )}
                </div>
              </div>

              {/* Criterios de Evaluación */}
              {instrument.criteria && instrument.criteria.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Criterios de Evaluación</h3>
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                    <ul className="space-y-1.5">
                      {instrument.criteria.map(c => (
                        <li key={c.id} className="flex items-start gap-2 text-slate-700 dark:text-slate-300 text-sm">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          {c.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex justify-between items-center gap-3 px-7 pt-4 pb-7 mt-2">
              {onDeleteInstrument ? (
                <button
                  type="button"
                  onClick={async () => {
                    const isConfirmed = await confirm({
                        title: 'Eliminar instrumento',
                        message: `¿Eliminar el instrumento "${instrument.name}"? Las calificaciones asociadas también serán eliminadas.`,
                        type: 'danger',
                        confirmText: 'Eliminar',
                    });
                    if (isConfirmed) {
                      onDeleteInstrument(instrument.id);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-semibold py-2 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm"
                >
                  <TrashIcon className="w-4 h-4" />
                  Eliminar
                </button>
              ) : <div />}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onEditInstrumentClick(instrument)}
                  className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-5 rounded-2xl transition-all text-sm"
                >
                  <PencilIcon className="w-4 h-4" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onExpressGradingClick(instrument)}
                  className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-amber-900 font-bold py-2.5 px-5 rounded-2xl transition-all shadow-lg text-sm"
                >
                  <BoltIcon className="w-4 h-4" />
                  Calificación Rápida
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
