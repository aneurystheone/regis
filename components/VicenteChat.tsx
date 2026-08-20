import React, { useState, useRef, useEffect } from 'react';
import type { Class, Student, View } from '../types';
import { SparklesIcon, StarIcon, CheckIcon, BookOpenIcon, UserGroupIcon, UserCircleIcon, DocumentTextIcon, ClipboardCheckIcon, CalendarIcon } from './icons';
import { chatWithVicente } from '../services/geminiService';
import { useCanUseAI, useSubscription } from '../contexts/SubscriptionContext';

interface VicenteChatProps {
  classes: Class[];
  students: Student[];
  teacherName?: string;
  onNavigate?: (view: View) => void;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const QUICK_ACTIONS = [
  {
    id: 'early_warning',
    title: '🚨 Alerta Temprana',
    subtitle: 'Analizar estudiantes en riesgo de inasistencia o rezago',
    prompt: 'Vicente, ¿qué indicadores o ausencias debo evaluar esta semana para identificar estudiantes en riesgo pedagógico?',
    bg: 'from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
  },
  {
    id: 'parent_comm',
    title: '✉️ Comunicado a Tutores',
    subtitle: 'Redactar informe formal y empático para padres',
    prompt: 'Vicente, ayúdame a redactar una plantilla de comunicado formal y empático para informar a los tutores sobre el progreso del periodo.',
    bg: 'from-indigo-500/10 to-purple-500/10 border-indigo-500/30 text-indigo-900 dark:text-indigo-200'
  },
  {
    id: 'recovery_plan',
    title: '🛠️ Plan de Recuperación',
    subtitle: 'Diseñar actividades de refuerzo por competencia',
    prompt: 'Vicente, ¿cómo estructuro un Plan de Recuperación Pedagógica para estudiantes con competencias pendientes en el nivel secundario/primario?',
    bg: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
  },
  {
    id: 'quiz_gen',
    title: '📝 Prueba / Quiz de Aula',
    subtitle: 'Generar examen corto con clave de respuestas',
    prompt: 'Vicente, propón una estructura de prueba corta de 5 preguntas sobre la Adecuación Curricular para mi asignatura.',
    bg: 'from-blue-500/10 to-cyan-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200'
  },
  {
    id: 'lesson_plan',
    title: '📅 Planificación de Clase',
    subtitle: 'Ir al Planificador Didáctico de Vicente',
    prompt: '',
    navigateTo: 'LESSON_PLANNER' as View,
    bg: 'from-violet-500/10 to-fuchsia-500/10 border-violet-500/30 text-violet-900 dark:text-violet-200'
  },
  {
    id: 'import_guide',
    title: '📋 Extracción de Listas',
    subtitle: 'Importar estudiantes escaneando lista o foto',
    prompt: 'Vicente, explícame cómo funciona la extracción automática de listas de estudiantes desde una foto u horario.',
    bg: 'from-pink-500/10 to-rose-500/10 border-pink-500/30 text-pink-900 dark:text-pink-200'
  }
];

export const VicenteChat: React.FC<VicenteChatProps> = ({ classes, students, teacherName = 'Docente', onNavigate }) => {
  const { isPremium } = useSubscription();
  const canUseVicente = useCanUseAI('vicenteAssistant');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `¡Hola, colega ${teacherName}! Soy **Vicente**, tu asistente docente experto en la Adecuación Curricular del MINERD.\n\n¿En qué te puedo apoyar hoy? Puedes seleccionar una **acción rápida** a continuación o escribirme cualquier consulta sobre tu aula, actividades o reportes.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const response = await chatWithVicente(text, history, {
        teacherName,
        classCount: classes.length,
        studentCount: students.length
      });

      const vicenteMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, vicenteMsg]);
    } catch (error) {
      console.error('Error enviando mensaje a Vicente:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-brand-bg dark:bg-slate-900 min-h-full flex flex-col max-w-6xl mx-auto select-text">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-primary via-indigo-900 to-purple-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 p-0.5 shadow-xl flex-shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <SparklesIcon className="w-9 h-9 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Asistente IA Vicente</h1>
              {isPremium ? (
                <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold text-[10px] uppercase rounded-full tracking-wider flex items-center gap-1">
                  <StarIcon className="w-3 h-3 text-amber-400" /> Plan Pro Activo
                </span>
              ) : (
                <span className="px-3 py-1 bg-slate-700 text-slate-300 font-bold text-[10px] uppercase rounded-full tracking-wider">
                  Plan Gratuito
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 font-medium">
              Asistente pedagógico especializado en el currículo dominicano (MINERD), alertas y reportes.
            </p>
          </div>
        </div>

        {!isPremium && (
          <button
            onClick={() => onNavigate?.('SUBSCRIPTION')}
            className="z-10 w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl hover:scale-105 transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2"
          >
            <StarIcon className="w-4 h-4 text-slate-950" />
            Desbloquear Vicente Ilimitado
          </button>
        )}
      </div>

      {/* Quick Access Grid (Cuadros de Acceso Rápido) */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-amber-400" /> Acciones Rápidas & Funciones de Alto Valor
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map(action => (
            <div
              key={action.id}
              onClick={() => {
                if (action.navigateTo) {
                  onNavigate?.(action.navigateTo);
                } else if (action.prompt) {
                  handleSend(action.prompt);
                }
              }}
              className={`p-4 rounded-2xl border bg-gradient-to-br ${action.bg} hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between`}
            >
              <div>
                <h4 className="font-black text-sm mb-1 group-hover:translate-x-1 transition-transform">{action.title}</h4>
                <p className="text-xs opacity-80 leading-relaxed font-medium">{action.subtitle}</p>
              </div>
              <div className="mt-3 flex justify-end">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">
                  {action.navigateTo ? 'Abrir →' : 'Ejecutar →'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Conversation Container */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 flex-1 flex flex-col min-h-[450px] overflow-hidden">
        {/* Messages Feed */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar max-h-[500px]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md flex-shrink-0 mt-1">
                  V
                </div>
              )}
              
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm space-y-2 ${
                msg.role === 'user'
                  ? 'bg-brand-primary text-white rounded-tr-none'
                  : 'bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-600 rounded-tl-none'
              }`}>
                <div className="flex items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    {msg.role === 'user' ? teacherName : 'Vicente (IA Pedagógica)'}
                  </span>
                  <span className="text-[10px] opacity-50">{msg.timestamp}</span>
                </div>
                
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {msg.text}
                </div>

                {msg.role === 'model' && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[10px] font-bold text-slate-500 dark:text-slate-300 flex items-center gap-1 transition-colors"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <CheckIcon className="w-3 h-3 text-emerald-500" /> Copiado
                        </>
                      ) : (
                        'Copiar respuesta'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md flex-shrink-0">
                V
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-600 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-amber-600 animate-bounce delay-200" />
                <span className="text-xs text-slate-400 font-bold ml-2">Vicente está pensando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hazle una consulta o solicitud a Vicente..."
              disabled={isTyping}
              className="flex-1 p-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-brand-primary dark:focus:border-brand-secondary outline-none font-medium text-sm text-slate-800 dark:text-slate-100 shadow-inner"
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="px-6 py-3.5 bg-brand-primary hover:bg-brand-secondary text-white font-black rounded-xl transition-all shadow-md shadow-brand-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <SparklesIcon className="w-5 h-5 text-amber-400" />
              <span>Enviar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
