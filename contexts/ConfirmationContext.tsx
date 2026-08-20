import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AlertTriangleIcon, TrashIcon, AlertCircleIcon, QuestionMarkCircleIcon, CheckIcon } from '../components/icons';

type ConfirmationType = 'danger' | 'warning' | 'info' | 'question' | 'prompt' | 'success';

interface ConfirmationOptions {
  title: string;
  message: string;
  type?: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
  promptPlaceholder?: string;
  promptDefaultValue?: string;
}

interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  alert: (options: Omit<ConfirmationOptions, 'hideCancel'>) => Promise<void>;
  prompt: (options: ConfirmationOptions) => Promise<string | null>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmationProvider');
  }
  return context.confirm;
};

export const useAlert = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useAlert must be used within a ConfirmationProvider');
  }
  return context.alert;
};

export const usePrompt = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('usePrompt must be used within a ConfirmationProvider');
  }
  return context.prompt;
};

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: any) => void) | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const confirm = useCallback((opts: ConfirmationOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const alert = useCallback((opts: Omit<ConfirmationOptions, 'hideCancel'>) => {
    setOptions({ ...opts, hideCancel: true });
    setIsOpen(true);
    return new Promise<void>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const prompt = useCallback((opts: ConfirmationOptions) => {
    setOptions({ ...opts, type: 'prompt' });
    setPromptValue(opts.promptDefaultValue || '');
    setIsOpen(true);
    return new Promise<string | null>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (resolvePromise) {
      if (options?.type === 'prompt') {
        resolvePromise(promptValue);
      } else if (options?.hideCancel) {
        resolvePromise(undefined);
      } else {
        resolvePromise(true);
      }
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolvePromise) {
      if (options?.type === 'prompt') {
        resolvePromise(null);
      } else if (options?.hideCancel) {
        resolvePromise(undefined);
      } else {
        resolvePromise(false);
      }
    }
    setIsOpen(false);
  };

  const renderIcon = () => {
    if (!options) return null;
    switch (options.type) {
      case 'danger':
        return (
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 ring-8 ring-red-50 dark:ring-red-900/10">
            <TrashIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 ring-8 ring-amber-50 dark:ring-amber-900/10">
            <AlertTriangleIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
        );
      case 'info':
        return (
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 ring-8 ring-blue-50 dark:ring-blue-900/10">
            <AlertCircleIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        );
      case 'success':
        return (
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 ring-8 ring-emerald-50 dark:ring-emerald-900/10">
            <CheckIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        );
      case 'question':
      case 'prompt':
      default:
        return (
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4 ring-8 ring-indigo-50 dark:ring-indigo-900/10">
            <QuestionMarkCircleIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        );
    }
  };

  const getConfirmButtonClass = () => {
    if (!options) return '';
    switch (options.type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-red-500/30 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 shadow-amber-500/30 text-white';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-emerald-500/30 text-white';
      case 'info':
      case 'question':
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500';
    }
  };

  return (
    <ConfirmationContext.Provider value={{ confirm, alert, prompt }}>
      {children}

      {isOpen && options && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col items-center text-center">
              {renderIcon()}
              
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {options.title}
              </h3>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                {options.message}
              </p>

              {options.type === 'prompt' && (
                <div className="w-full mb-6">
                  <input
                    type="text"
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    placeholder={options.promptPlaceholder || ''}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800 dark:text-slate-200"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
                {!options.hideCancel && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                  >
                    {options.cancelText || 'Cancelar'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 shadow-sm ${getConfirmButtonClass()}`}
                >
                  {options.confirmText || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
};
