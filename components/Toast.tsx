import React, { useEffect, useState } from 'react';
import { CheckIcon, XIcon, ExclamationIcon } from './icons';

export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-24 md:bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};

const Toast: React.FC<{ toast: ToastMessage; onRemove: () => void }> = ({ toast, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onRemove]);

    const bgColors = {
        success: 'bg-indigo-600 dark:bg-indigo-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-slate-600'
    };

    const icons = {
        success: <CheckIcon className="w-5 h-5" />,
        error: <XIcon className="w-5 h-5" />,
        warning: <ExclamationIcon className="w-5 h-5" />,
        info: <div className="w-5 h-5 rounded-full border-2 border-white/50" />
    };

    return (
        <div className={`${bgColors[toast.type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up pointer-events-auto`}>
            {icons[toast.type]}
            <p className="font-medium text-sm">{toast.message}</p>
        </div>
    );
};
