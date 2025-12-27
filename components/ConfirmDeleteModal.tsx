import React from 'react';
import { XIcon, TrashIcon, ExclamationIcon } from './icons';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  confirmButtonIcon?: React.ReactNode;
  confirmButtonClassName?: string;
  icon?: React.ReactNode;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmButtonText = 'Eliminar',
  confirmButtonIcon = <TrashIcon className="w-4 h-4 mr-2" />,
  confirmButtonClassName = 'bg-red-600 text-white hover:bg-red-700',
  icon = (
    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
        <ExclamationIcon className="h-6 w-6 text-red-600" />
    </div>
  )
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md m-4 transform transition-all" role="document">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors" aria-label="Cerrar modal">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex items-start gap-4">
          {icon}
          <div className="mt-0 text-left flex-1">
            <p className="text-slate-600 dark:text-slate-300">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-4 pt-6 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex items-center font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm ${confirmButtonClassName}`}
          >
            {confirmButtonIcon}
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};