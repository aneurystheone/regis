import React, { useState } from 'react';
import type { LessonPlan, Class, LessonActivity } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, SparklesIcon, XIcon, CalendarIcon, BookOpenIcon, DownloadIcon } from './icons';
import { generateLessonPlan } from '../services/geminiService';

declare const jspdf: any;

interface LessonPlannerProps {
  classes: Class[];
  lessonPlans: LessonPlan[];
  onAddLessonPlan: (plan: Omit<LessonPlan, 'id'>) => void;
  onUpdateLessonPlan: (id: string, plan: Omit<LessonPlan, 'id'>) => void;
  onDeleteLessonPlan: (id: string) => void;
}

export const LessonPlanner: React.FC<LessonPlannerProps> = ({ classes, lessonPlans, onAddLessonPlan, onUpdateLessonPlan, onDeleteLessonPlan }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('');
  const [classId, setClassId] = useState('');
  const [objectives, setObjectives] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [activities, setActivities] = useState<LessonActivity[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleOpenModal = (plan?: LessonPlan) => {
    if (plan) {
      setEditingPlanId(plan.id); setTopic(plan.topic); setDate(plan.date); setClassId(plan.classId);
      setObjectives(plan.objectives || []); setMaterials(plan.materials || []); setActivities(plan.activities || []);
    } else {
      setEditingPlanId(null); setTopic(''); setDate(new Date().toISOString().split('T')[0]);
      setClassId(classes[0]?.id || ''); setObjectives([]); setMaterials([]); setActivities([]);
    }
    setIsModalOpen(true);
  };

  const handleGenerate = async () => {
    const selectedClass = classes.find(c => c.id === classId);
    if (!selectedClass || !topic.trim()) return;
    setIsGenerating(true);
    const result = await generateLessonPlan(selectedClass.grade, selectedClass.name, topic);
    if (result) {
      setObjectives(result.objectives); setMaterials(result.materials); setActivities(result.activities);
    }
    setIsGenerating(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !classId || !date) return;
    const planData = { classId, topic, date, objectives, materials, activities };
    editingPlanId ? onUpdateLessonPlan(editingPlanId, planData) : onAddLessonPlan(planData);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-brand-bg dark:bg-slate-900 min-h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-brand-primary dark:text-slate-100 tracking-tight">Planificación</h2>
        <button onClick={() => handleOpenModal()} className="flex items-center bg-brand-primary text-white font-black py-2 px-6 rounded-xl hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/10 active:scale-95">
          <PlusIcon className="w-5 h-5 mr-2" /> Nuevo Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lessonPlans.map(plan => {
          const cls = classes.find(c => c.id === plan.classId);
          return (
            <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-brand-primary hover:shadow-xl transition-all">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-black text-brand-primary dark:text-slate-100 line-clamp-2">{plan.topic}</h3>
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest space-y-2">
                  <p className="flex items-center gap-2"><BookOpenIcon className="w-4 h-4 text-brand-secondary"/> {cls?.name}</p>
                  <p className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-brand-accent"/> {new Date(plan.date).toLocaleDateString()}</p>
                </div>
                <div className="mt-6 flex justify-end gap-3 border-t border-slate-50 dark:border-slate-700 pt-4">
                   <button onClick={() => handleOpenModal(plan)} className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-bg dark:hover:bg-slate-700 rounded-lg transition-all"><PencilIcon className="w-5 h-5"/></button>
                   <button onClick={() => onDeleteLessonPlan(plan.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><TrashIcon className="w-5 h-5"/></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-brand-primary/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
                    <SparklesIcon className="w-6 h-6 text-brand-accent" />
                 </div>
                 <h2 className="text-xl font-black text-brand-primary dark:text-slate-100 tracking-tight">Planificar con Vicente</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><XIcon className="w-6 h-6"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="bg-brand-bg dark:bg-slate-700/30 p-6 rounded-2xl border border-brand-secondary/10 flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 w-full space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tema de la clase</label>
                            <input type="text" value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-600 rounded-xl focus:border-brand-secondary outline-none transition-all font-bold" placeholder="¿Qué tema quieres tratar hoy?" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Curso</label>
                                <select value={classId} onChange={e => setClassId(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-600 rounded-xl font-bold">
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} - {c.grade}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-600 rounded-xl font-bold" />
                            </div>
                        </div>
                    </div>
                    <button onClick={handleGenerate} disabled={isGenerating || !topic} className="w-full md:w-auto flex items-center justify-center bg-brand-accent text-brand-primary font-black py-4 px-8 rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-brand-accent/20 disabled:opacity-50 group">
                        {isGenerating ? <div className="w-6 h-6 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" /> : (
                            <>
                                <SparklesIcon className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                                Preguntar a Vicente
                            </>
                        )}
                    </button>
                </div>

                {(objectives.length > 0 || activities.length > 0) && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-brand-secondary uppercase tracking-widest border-b border-brand-secondary/20 pb-2">Objetivos Sugeridos</h4>
                                <ul className="space-y-2">
                                    {objectives.map((obj, i) => (
                                        <li key={i} className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5 flex-shrink-0" />
                                            {obj}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                             <div className="space-y-4">
                                <h4 className="text-xs font-black text-brand-secondary uppercase tracking-widest border-b border-brand-secondary/20 pb-2">Recursos Necesarios</h4>
                                <div className="flex flex-wrap gap-2">
                                    {materials.map((mat, i) => (
                                        <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">{mat}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-brand-secondary uppercase tracking-widest border-b border-brand-secondary/20 pb-2">Propuesta Didáctica</h4>
                            <div className="space-y-4">
                                {activities.map((act, i) => (
                                    <div key={i} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-600">
                                        <span className="w-20 font-black text-brand-primary dark:text-brand-secondary text-sm">{act.time}</span>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{act.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-brand-primary">Descartar</button>
              <button onClick={handleSave} className="bg-brand-primary text-white font-black py-2 px-8 rounded-xl hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/10">Guardar Planificación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};