import React, { useState, useRef, useCallback } from 'react';
import { MicrophoneIcon, StopIcon } from './icons';
import { useAlert } from '../contexts/ConfirmationContext';

type RecorderState = 'idle' | 'starting' | 'recording' | 'stopping';

interface AudioRecorderProps {
  onRecordingComplete: (audioUrl: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  /** Pre-warmed MediaStream from parent. Skips getUserMedia for instant start. Parent owns track lifecycle. */
  prewarmedStream?: MediaStream | null;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, onRecordingStateChange, prewarmedStream }) => {
  // Authoritative state in ref (synchronous, no React batching delay)
  const stateRef = useRef<RecorderState>('idle');
  // React state mirrors ref for UI rendering
  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // Track whether we own the stream (so we know to release it on stop)
  const ownsStreamRef = useRef(false);
  const alert = useAlert();

  const transition = (next: RecorderState) => {
    stateRef.current = next;
    setRecorderState(next);
  };

  const handleClick = useCallback(async () => {
    const current = stateRef.current;

    // Only act on stable states — ignore clicks during transitions
    if (current === 'starting' || current === 'stopping') return;

    if (current === 'idle') {
      // === START RECORDING ===
      transition('starting');

      try {
        let stream: MediaStream;
        if (prewarmedStream && prewarmedStream.active) {
          // Use pre-warmed stream — instant start, no hardware delay
          stream = prewarmedStream;
          ownsStreamRef.current = false;
        } else {
          // Fallback: acquire mic on-demand
          if (!navigator?.mediaDevices?.getUserMedia) {
            throw new Error('El micrófono no está disponible en este contexto. Los navegadores requieren HTTPS o localhost para grabar audio.');
          }
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          ownsStreamRef.current = true;
        }

        // Check if user clicked stop while getUserMedia was resolving
        if (stateRef.current !== 'starting') {
          if (ownsStreamRef.current) stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            onRecordingComplete(reader.result as string);
          };
          reader.readAsDataURL(audioBlob);

          // Only release mic if we own the stream (not pre-warmed)
          if (ownsStreamRef.current) {
            streamRef.current?.getTracks().forEach(track => track.stop());
          }
          streamRef.current = null;
          mediaRecorderRef.current = null;

          transition('idle');
          onRecordingStateChange?.(false);
        };

        // timeslice=250ms: limits data buffered on stop()
        recorder.start(250);

        transition('recording');
        onRecordingStateChange?.(true);
      } catch (err: any) {
        console.error("Error accessing microphone:", err);
        transition('idle');
        const isNotAllowed = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
        await alert({
          title: 'Permiso de Micrófono',
          message: isNotAllowed
            ? 'El permiso para usar el micrófono fue denegado. Por favor, habilítalo en la configuración de la app o navegador para poder grabar audio.'
            : (err?.message || 'No se pudo acceder al micrófono. Verifica los permisos de tu dispositivo.'),
          type: 'warning'
        });
      }
    } else if (current === 'recording') {
      // === STOP RECORDING ===
      transition('stopping');

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop(); // triggers onstop → transition('idle')
      } else {
        // Recorder already inactive — clean up manually
        if (ownsStreamRef.current) {
          streamRef.current?.getTracks().forEach(t => t.stop());
        }
        streamRef.current = null;
        mediaRecorderRef.current = null;
        transition('idle');
        onRecordingStateChange?.(false);
      }
    }
  }, [onRecordingComplete, onRecordingStateChange]);

  const isRecording = recorderState === 'recording';
  const isTransitioning = recorderState === 'starting' || recorderState === 'stopping';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isTransitioning}
      className={`p-2 rounded-lg transition-colors ${
        isTransitioning
          ? 'bg-slate-300 dark:bg-slate-600 text-slate-400 cursor-wait'
          : isRecording
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
      }`}
      aria-label={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
    >
      {recorderState === 'starting' ? (
        <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
      ) : isRecording || recorderState === 'stopping' ? (
        <StopIcon />
      ) : (
        <MicrophoneIcon />
      )}
    </button>
  );
};
