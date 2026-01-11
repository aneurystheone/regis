
import React, { useState } from 'react';
import type { Student, Class } from '../types';
import { RestoreIcon, TrashIcon, UserIcon, BookOpenIcon } from './icons';

interface RecycleBinProps {
  deletedStudents: Student[];
  classes: Class[];
  onRestore: (studentId: string) => void;
  onPermanentDelete: (student: Student) => void;

  deletedClasses?: Class[];
  onRestoreClass?: (classId: string) => void;
  onPermanentDeleteClass?: (cls: Class) => void;
  onPermanentDeleteBulk?: (students: Student[]) => void;
  onPermanentDeleteClassesBulk?: (classes: Class[]) => void;
}

export const RecycleBin: React.FC<RecycleBinProps> = ({
  deletedStudents,
  classes,
  onRestore,
  onPermanentDelete,
  deletedClasses = [],
  onRestoreClass,
  onPermanentDeleteClass,
  onPermanentDeleteBulk,
  onPermanentDeleteClassesBulk
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'classes'>('students');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Clear selections when changing tabs
  React.useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  const handleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    const currentList = activeTab === 'students' ? deletedStudents : deletedClasses;
    if (selectedIds.length === currentList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentList.map(i => i.id));
    }
  };

  const handleBulkRestore = () => {
    selectedIds.forEach(id => {
      if (activeTab === 'students') onRestore(id);
      else onRestoreClass?.(id);
    });
    setSelectedIds([]);
  };

  const handleBulkPermanentDelete = () => {
    if (activeTab === 'students') {
      const studentsToDelete = deletedStudents.filter(s => selectedIds.includes(s.id));
      if (onPermanentDeleteBulk) {
        onPermanentDeleteBulk(studentsToDelete);
      } else {
        // Fallback if bulk not supported (should not happen with new App.tsx)
        studentsToDelete.forEach(s => onPermanentDelete(s));
      }
    } else {
      const classesToDelete = deletedClasses.filter(c => selectedIds.includes(c.id));
      if (onPermanentDeleteClassesBulk) {
        onPermanentDeleteClassesBulk(classesToDelete);
      } else if (onPermanentDeleteClass) {
        classesToDelete.forEach(c => onPermanentDeleteClass(c));
      }
    }
    setSelectedIds([]);
  };

  const getClassInfo = (classId: string) => {
    const foundClass = classes.find(c => c.id === classId);
    return foundClass ? `${foundClass.grade.replace(' Grado', '')} ${foundClass.section} - ${foundClass.name}` : 'Clase Desconocida';
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center pb-2 px-4 font-semibold transition-colors ${activeTab === 'students'
            ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
        >
          <UserIcon className="w-5 h-5 mr-2" />
          Estudiantes Eliminados ({deletedStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`flex items-center pb-2 px-4 font-semibold transition-colors ${activeTab === 'classes'
            ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
        >
          <BookOpenIcon className="w-5 h-5 mr-2" />
          Clases Eliminadas ({deletedClasses.length})
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/40 p-4 rounded-lg animate-fade-in">
          <span className="font-bold text-indigo-900 dark:text-indigo-100">{selectedIds.length} seleccionados</span>
          <div className="flex gap-2">
            <button onClick={handleBulkRestore} className="text-sm bg-white dark:bg-slate-700 text-green-600 font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-green-50">
              Restaurar
            </button>
            <button onClick={handleBulkPermanentDelete} className="text-sm bg-red-500 text-white font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-red-600">
              Eliminar
            </button>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <>
          {/* Table for Desktop */}
          <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th scope="col" className="p-4 w-12">
                    <input type="checkbox" checked={deletedStudents.length > 0 && selectedIds.length === deletedStudents.length} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Nombre</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Clase Original</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {deletedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-4">
                      <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => handleSelect(student.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img className="h-10 w-10 rounded-full object-cover" src={student.avatar} alt={student.name} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{student.name}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">ID: {student.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {getClassInfo(student.classId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => onRestore(student.id)}
                          className="flex items-center text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-semibold py-2 px-3 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                        >
                          <RestoreIcon className="mr-2 w-4 h-4" />
                          Restaurar
                        </button>
                        <button
                          onClick={() => onPermanentDelete(student)}
                          className="flex items-center text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold py-2 px-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4 mr-2" />
                          Eliminar Permanentemente
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {deletedStudents.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-10 text-slate-500 dark:text-slate-400">La papelera de reciclaje de estudiantes está vacía.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Cards for Mobile */}
          <div className="md:hidden space-y-4">
            {deletedStudents.map(student => (
              <div key={student.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
                <div className="flex items-center gap-4 mb-3">
                  <img className="h-12 w-12 rounded-full object-cover" src={student.avatar} alt={student.name} />
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 dark:text-slate-100">{student.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">ID: {student.id}</p>
                  </div>
                </div>
                <div className="text-sm bg-slate-50 dark:bg-slate-700 p-2 rounded-md mb-4">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">Clase Original:</p>
                  <p className="text-slate-500 dark:text-slate-400">{getClassInfo(student.classId)}</p>
                </div>
                <div className="flex flex-col sm:flex-row justify-end items-center gap-2">
                  <button onClick={() => onRestore(student.id)} className="w-full sm:w-auto flex items-center justify-center text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-semibold py-2 px-3 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50">
                    <RestoreIcon className="mr-2 w-4 h-4" />
                    Restaurar
                  </button>
                  <button onClick={() => onPermanentDelete(student)} className="w-full sm:w-auto flex items-center justify-center text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold py-2 px-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50">
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
            {deletedStudents.length === 0 && (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl shadow-md">
                La papelera de reciclaje de estudiantes está vacía.
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'classes' && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th scope="col" className="p-4 w-12">
                    <input type="checkbox" checked={deletedClasses.length > 0 && selectedIds.length === deletedClasses.length} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Clase</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Año Escolar</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {deletedClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-4">
                      <input type="checkbox" checked={selectedIds.includes(cls.id)} onChange={() => handleSelect(cls.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-2 h-10 mr-4 rounded-full" style={{ backgroundColor: cls.color }}></div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{cls.name}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{cls.grade} {cls.section}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {cls.schoolYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-4">
                        {onRestoreClass && (
                          <button
                            onClick={() => onRestoreClass(cls.id)}
                            className="flex items-center text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-semibold py-2 px-3 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                          >
                            <RestoreIcon className="mr-2 w-4 h-4" />
                            Restaurar
                          </button>
                        )}
                        {onPermanentDeleteClass && (
                          <button
                            onClick={() => onPermanentDeleteClass(cls)}
                            className="flex items-center text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold py-2 px-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Eliminar Permanentemente
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {deletedClasses.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-10 text-slate-500 dark:text-slate-400">La papelera de reciclaje de clases está vacía.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};