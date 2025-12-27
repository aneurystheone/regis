import React, { useState, useRef, useEffect } from 'react';
import type { Student, AttendanceRecord } from '../types';
import { AttendanceStatus } from '../types';
import { UserCheckIcon, XIcon, ClockIcon, PencilSquareIcon, CheckIcon, ArrowUturnLeftIcon } from './icons';

interface FastAttendanceProps {
  students: Student[];
  onClose: () => void;
  onSave: (records: AttendanceRecord[]) => void;
  date: string;
}

export const FastAttendance: React.FC<FastAttendanceProps> = ({ students, onClose, onSave, date }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [swipeState, setSwipeState] = useState({ x: 0, y: 0, action: null as string | null, intensity: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const hasVibrated = useRef(false);

  const currentStudent = students[currentIndex];
  const isFinished = currentIndex >= students.length;

  const SWIPE_THRESHOLD = 80;

  const handleSwipe = (status: AttendanceStatus) => {
    if (!currentStudent || isAnimating) return;
    
    // Haptic feedback for action confirmation
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
    }

    const newRecord: AttendanceRecord = {
        studentId: currentStudent.id,
        date,
        status,
    };
    
    // Calculate final position
    let targetX = 0;
    let targetY = 0;
    const distance = 800; // Far enough off screen

    switch (status) {
        case AttendanceStatus.PRESENT: targetX = distance; break;
        case AttendanceStatus.ABSENT: targetX = -distance; break;
        case AttendanceStatus.LATE: targetY = -distance; break;
        case AttendanceStatus.EXCUSED: targetY = distance; break;
    }

    // Start animation state
    setIsAnimating(true);
    setSwipeState({ 
        x: targetX, 
        y: targetY, 
        action: status, 
        intensity: 1 
    });

    // Wait for animation to finish before committing record and resetting
    setTimeout(() => {
        setRecords(prev => [...prev, newRecord]);
        setCurrentIndex(prev => prev + 1);
        setSwipeState({ x: 0, y: 0, action: null, intensity: 0 });
        setIsAnimating(false);
    }, 450); // Slightly longer than transition duration
  };

  const handleUndo = () => {
    if (currentIndex > 0 && !isAnimating) {
        setRecords(prev => prev.slice(0, -1));
        setCurrentIndex(prev => prev - 1);
        setSwipeState({ x: 0, y: 0, action: null, intensity: 0 });
    }
  };
  
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (isDragging.current || isAnimating) return;
      isDragging.current = true;
      startPos.current = { x: e.clientX, y: e.clientY };
      hasVibrated.current = false;
      cardRef.current?.setPointerCapture(e.pointerId);
  };
  
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current || isAnimating) return;
      
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;
      
      let action: string | null = null;
      let intensity = 0;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0) action = AttendanceStatus.PRESENT;
          else action = AttendanceStatus.ABSENT;
          intensity = Math.min(Math.abs(deltaX) / (SWIPE_THRESHOLD * 1.5), 1);
      } else {
          if (deltaY > 0) action = AttendanceStatus.EXCUSED;
          else action = AttendanceStatus.LATE;
          intensity = Math.min(Math.abs(deltaY) / (SWIPE_THRESHOLD * 1.5), 1);
      }

      const isOverThreshold = Math.abs(deltaX) > SWIPE_THRESHOLD || Math.abs(deltaY) > SWIPE_THRESHOLD;
      if (isOverThreshold && !hasVibrated.current) {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(15);
          }
          hasVibrated.current = true;
      } else if (!isOverThreshold && hasVibrated.current) {
          hasVibrated.current = false;
      }
      
      setSwipeState({ x: deltaX, y: deltaY, action, intensity });
  };
  
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current || isAnimating) return;
      isDragging.current = false;
      cardRef.current?.releasePointerCapture(e.pointerId);

      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;
      
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
          handleSwipe(deltaX > 0 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT);
      } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > SWIPE_THRESHOLD) {
          handleSwipe(deltaY > 0 ? AttendanceStatus.EXCUSED : AttendanceStatus.LATE);
      } else {
          // Snap back
          setIsAnimating(true);
          setSwipeState({ x: 0, y: 0, action: null, intensity: 0 });
          setTimeout(() => setIsAnimating(false), 300);
      }
  };

  const handleFinish = () => {
    onSave(records);
    onClose();
  };

  const getColorForAction = (action: string | null) => {
      switch (action) {
          case AttendanceStatus.PRESENT: return 'rgb(34, 197, 94)'; // Green
          case AttendanceStatus.ABSENT: return 'rgb(239, 68, 68)'; // Red
          case AttendanceStatus.LATE: return 'rgb(234, 179, 8)'; // Yellow
          case AttendanceStatus.EXCUSED: return 'rgb(59, 130, 246)'; // Blue
          default: return 'transparent';
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col justify-center items-center overflow-hidden" aria-modal="true" role="dialog">
       {/* Global Action Feedback Gradients */}
       <div className="absolute inset-0 pointer-events-none transition-opacity duration-300" 
            style={{ 
                opacity: swipeState.action === AttendanceStatus.PRESENT ? swipeState.intensity * 0.4 : 0,
                background: 'radial-gradient(circle at right center, rgba(34, 197, 94, 0.6), transparent 70%)' 
            }}></div>
       <div className="absolute inset-0 pointer-events-none transition-opacity duration-300" 
            style={{ 
                opacity: swipeState.action === AttendanceStatus.ABSENT ? swipeState.intensity * 0.4 : 0,
                background: 'radial-gradient(circle at left center, rgba(239, 68, 68, 0.6), transparent 70%)' 
            }}></div>
       <div className="absolute inset-0 pointer-events-none transition-opacity duration-300" 
            style={{ 
                opacity: swipeState.action === AttendanceStatus.LATE ? swipeState.intensity * 0.4 : 0,
                background: 'radial-gradient(circle at top center, rgba(234, 179, 8, 0.6), transparent 70%)' 
            }}></div>
       <div className="absolute inset-0 pointer-events-none transition-opacity duration-300" 
            style={{ 
                opacity: swipeState.action === AttendanceStatus.EXCUSED ? swipeState.intensity * 0.4 : 0,
                background: 'radial-gradient(circle at bottom center, rgba(59, 130, 246, 0.6), transparent 70%)' 
            }}></div>

      <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white z-50 backdrop-blur-md transition-colors"><XIcon className="w-6 h-6"/></button>

      {isFinished ? (
        <div className="text-center text-white bg-slate-800/90 backdrop-blur-md p-8 rounded-xl shadow-2xl z-10 border border-slate-700 animate-fade-in-up">
            <div className="mx-auto bg-green-500 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
                 <CheckIcon className="w-10 h-10 text-white"/>
            </div>
            <h2 className="text-3xl font-bold mb-2">¡Asistencia Completa!</h2>
            <p className="mb-6 text-slate-300">{students.length} estudiantes han sido marcados.</p>
            <button onClick={handleFinish} className="flex items-center mx-auto bg-indigo-600 text-white font-bold py-3 px-8 rounded-full hover:bg-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-1">
                 Finalizar
            </button>
        </div>
      ) : (
        <>
            <p className="text-white/90 font-bold text-lg mb-6 z-10 drop-shadow-md tracking-wide">{currentIndex + 1} / {students.length}</p>
            
            {/* Card stack container */}
            <div className="relative w-72 h-96 z-10">
                {students.map((student, index) => {
                    // Render current card and the one below
                    if (index < currentIndex || index > currentIndex + 1) return null;
                    
                    const isTopCard = index === currentIndex;
                    
                    return (
                        <div
                            key={student.id}
                            ref={isTopCard ? cardRef : null}
                            onPointerDown={isTopCard ? handlePointerDown : undefined}
                            onPointerMove={isTopCard ? handlePointerMove : undefined}
                            onPointerUp={isTopCard ? handlePointerUp : undefined}
                            className={`absolute inset-0 rounded-3xl shadow-2xl bg-white flex flex-col items-center justify-center text-center overflow-hidden ${isTopCard && !isAnimating ? 'cursor-grab active:cursor-grabbing touch-none' : 'touch-none'}`}
                            style={{ 
                                transform: isTopCard 
                                    ? `translate(${swipeState.x}px, ${swipeState.y}px) rotate(${swipeState.x * 0.08}deg)` 
                                    : `scale(${1 - (index - currentIndex) * 0.05}) translateY(${(index - currentIndex) * 15}px)`,
                                zIndex: students.length - index,
                                opacity: isTopCard ? (isAnimating && Math.abs(swipeState.x + swipeState.y) > 200 ? 0 : 1) : 1 - (index - currentIndex) * 0.3,
                                transition: isAnimating ? 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease-out' : 'none',
                                userSelect: 'none',
                             }}
                        >
                             {/* Tint Overlay */}
                            {isTopCard && (
                                <div 
                                    className="absolute inset-0 z-10 pointer-events-none"
                                    style={{ 
                                        backgroundColor: swipeState.action ? getColorForAction(swipeState.action) : 'transparent',
                                        opacity: swipeState.action ? Math.min(swipeState.intensity * 0.5, 0.5) : 0,
                                        transition: isAnimating ? 'opacity 0.4s' : 'none'
                                    }}
                                />
                            )}

                            {isTopCard && (
                                <>
                                    {/* Swiping Indicator Labels */}
                                    <div className={`absolute top-12 left-6 border-4 border-green-500 text-green-500 bg-white/90 rounded-lg px-3 py-1 text-2xl font-black uppercase tracking-widest transition-opacity duration-200 pointer-events-none z-20 ${swipeState.action === AttendanceStatus.PRESENT && swipeState.intensity > 0.15 ? 'opacity-100' : 'opacity-0'}`} style={{ transform: 'rotate(-15deg)' }}>Presente</div>
                                    <div className={`absolute top-12 right-6 border-4 border-red-500 text-red-500 bg-white/90 rounded-lg px-3 py-1 text-2xl font-black uppercase tracking-widest transition-opacity duration-200 pointer-events-none z-20 ${swipeState.action === AttendanceStatus.ABSENT && swipeState.intensity > 0.15 ? 'opacity-100' : 'opacity-0'}`} style={{ transform: 'rotate(15deg)' }}>Ausente</div>
                                    <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 border-4 border-yellow-500 text-yellow-500 bg-white/90 rounded-lg px-3 py-1 text-2xl font-black uppercase tracking-widest transition-opacity duration-200 pointer-events-none z-20 ${swipeState.action === AttendanceStatus.LATE && swipeState.intensity > 0.15 ? 'opacity-100' : 'opacity-0'}`} style={{ transform: 'rotate(0deg)' }}>Tarde</div>
                                    <div className={`absolute top-12 left-1/2 -translate-x-1/2 border-4 border-blue-500 text-blue-500 bg-white/90 rounded-lg px-3 py-1 text-2xl font-black uppercase tracking-widest transition-opacity duration-200 pointer-events-none z-20 ${swipeState.action === AttendanceStatus.EXCUSED && swipeState.intensity > 0.15 ? 'opacity-100' : 'opacity-0'}`}>Excusa</div>
                                </>
                            )}
                            
                            {/* Card Content */}
                            <div className="pointer-events-none select-none z-0 p-6 w-full h-full flex flex-col items-center justify-center">
                                <div className="relative mx-auto mb-6 w-40 h-40">
                                    <img src={student.avatar} alt={student.name} draggable={false} className="w-full h-full rounded-full object-cover border-4 border-slate-100 shadow-md"/>
                                    {student.orderNumber && (
                                        <div className="absolute top-0 right-0 bg-slate-800 text-white text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full shadow-md border-2 border-white">
                                            {student.orderNumber}
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-2xl font-extrabold text-slate-800 mb-2 line-clamp-2">{student.name}</h3>
                                <p className="text-slate-500 font-medium">ID: {student.id}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Action Buttons */}
            <div className="mt-10 flex flex-col items-center gap-6 z-10">
                 <div className="flex items-center justify-center gap-6 text-white">
                    <button onClick={() => handleSwipe(AttendanceStatus.ABSENT)} disabled={isAnimating} title="Ausente (Izquierda)" className="bg-red-500 p-4 rounded-full shadow-lg shadow-red-500/30 hover:bg-red-400 hover:scale-110 transition-all active:scale-95 disabled:opacity-50"><XIcon className="w-6 h-6"/></button>
                    <div className="flex flex-col gap-4">
                         <button onClick={() => handleSwipe(AttendanceStatus.LATE)} disabled={isAnimating} title="Tarde (Arriba)" className="bg-yellow-500 p-3 rounded-full shadow-lg shadow-yellow-500/30 hover:bg-yellow-400 hover:scale-110 transition-all active:scale-95 disabled:opacity-50"><ClockIcon className="w-5 h-5"/></button>
                         <button onClick={() => handleSwipe(AttendanceStatus.EXCUSED)} disabled={isAnimating} title="Excusa (Abajo)" className="bg-blue-500 p-3 rounded-full shadow-lg shadow-blue-500/30 hover:bg-blue-400 hover:scale-110 transition-all active:scale-95 disabled:opacity-50"><PencilSquareIcon className="w-5 h-5"/></button>
                    </div>
                    <button onClick={() => handleSwipe(AttendanceStatus.PRESENT)} disabled={isAnimating} title="Presente (Derecha)" className="bg-green-500 p-4 rounded-full shadow-lg shadow-green-500/30 hover:bg-green-400 hover:scale-110 transition-all active:scale-95 disabled:opacity-50"><UserCheckIcon className="w-6 h-6"/></button>
                </div>
                
                {/* Undo Button */}
                <button 
                    onClick={handleUndo} 
                    disabled={currentIndex === 0 || isAnimating}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-sm font-semibold transition-all ${currentIndex === 0 || isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                >
                    <ArrowUturnLeftIcon className="w-4 h-4"/>
                    Deshacer último
                </button>
            </div>
        </>
      )}
    </div>
  );
};