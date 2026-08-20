import React, { useState } from 'react';
import { authService } from '../services/authService';
import { SparklesIcon } from './icons';

interface ResetPasswordPageProps {
    oobCode: string;
    onSuccess: () => void;
    addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ oobCode, onSuccess, addToast }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);
        try {
            await authService.confirmPasswordReset(oobCode, password);
            addToast('Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión.', 'success');
            onSuccess(); // Redirect to login
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/expired-action-code') {
                setError('El enlace ha expirado. Por favor solicita uno nuevo.');
            } else if (err.code === 'auth/invalid-action-code') {
                setError('El enlace es inválido o ya fue usado.');
            } else if (err.code === 'auth/weak-password') {
                setError('La contraseña es muy débil.');
            } else {
                setError('Ocurrió un error al restablecer la contraseña. Intenta de nuevo.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">

                <div className="text-center mb-8">
                    <div className="mx-auto mb-4 w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                        <SparklesIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Restablecer Contraseña</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && <p className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-xl text-sm text-center">{error}</p>}

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Nueva Contraseña</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Confirmar Contraseña</label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            placeholder="Repite la contraseña"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isLoading ? 'Restableciendo...' : 'Guardar Nueva Contraseña'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button onClick={onSuccess} className="text-sm font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        Volver al inicio de sesión
                    </button>
                </div>
            </div>
        </div>
    );
};
