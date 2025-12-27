
import React, { useState, useEffect } from 'react';
import type { Student } from '../types';
import { XIcon, PencilIcon } from './icons';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSave: (studentId: string, updatedData: { name: string; avatar: string; orderNumber?: number }) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, student, onSave }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    if (student && isOpen) {
      setName(student.name);
      setAvatar(student.avatar);
      setOrderNumber(student.orderNumber?.toString() ?? '');
    } else if (!isOpen) {
      // Clear state when modal closes
      setName('');
      setAvatar('');
      setOrderNumber('');
    }
  }, [student, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (student && name.trim()) {
      onSave(student.id, { 
        name: name.trim(), 
        avatar: avatar.trim(), 
        orderNumber: orderNumber ? parseInt(orderNumber, 10) : undefined 
      });
    }
  };

  if (!isOpen || !student) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all" role="document">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Editar Estudiante</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors" aria-label="Cerrar modal">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="student-name-edit" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Nombre del Estudiante
            </label>
            <input
              id="student-name-edit"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-base border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="ej., Juana Pérez"
              required
            />
          </div>
           <div>
            <label htmlFor="student-order-number-edit" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Número de Orden (Opcional)
            </label>
            <input
              id="student-order-number-edit"
              type="number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full px-3 py-2 text-base border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="ej., 1"
              min="1"
            />
          </div>
          <div>
            <label htmlFor="student-avatar-edit" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              URL del Avatar
            </label>
            <input
              id="student-avatar-edit"
              type="text"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full px-3 py-2 text-base border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="ej., https://example.com/avatar.png"
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:bg-slate-400"
              disabled={!name.trim()}
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};