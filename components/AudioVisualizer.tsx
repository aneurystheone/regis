import React from 'react';

interface AudioVisualizerProps {
  isRecording: boolean;
}

// Pure CSS animations run on the compositor thread — no JS overhead and
// they vanish the instant the element unmounts (no "finish cycle" lag from framer-motion).
const barAnimation = (delay: number) => ({
  style: {
    animation: `audioBar 0.8s ease-in-out ${delay}s infinite alternate`,
    height: '8px',
  } as React.CSSProperties,
});

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isRecording }) => {
  if (!isRecording) return null;

  return (
    <>
      {/* Inline keyframes — injected once, tiny footprint */}
      <style>{`
        @keyframes audioBar {
          from { height: 8px; }
          to   { height: 24px; }
        }
      `}</style>
      <div className="flex items-center gap-1 h-8 px-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
        {[0, 0.1, 0.2, 0.3, 0.4].map((delay, i) => (
          <div
            key={i}
            className="w-1.5 bg-indigo-500 rounded-full"
            {...barAnimation(delay)}
          />
        ))}
        <span className="ml-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          Grabando...
        </span>
      </div>
    </>
  );
};
