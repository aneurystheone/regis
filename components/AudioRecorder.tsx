import React, { useState, useRef } from 'react';
import { MicrophoneIcon, StopIcon } from './icons';

interface AudioRecorderProps {
  onRecordingComplete: (audioUrl: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          onRecordingComplete(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono. Por favor, revise los permisos de su navegador.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <button
      type="button"
      onClick={isRecording ? handleStopRecording : handleStartRecording}
      className={`p-2 rounded-lg transition-colors ${
        isRecording
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
      }`}
      aria-label={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
    >
      {isRecording ? <StopIcon /> : <MicrophoneIcon />}
    </button>
  );
};
