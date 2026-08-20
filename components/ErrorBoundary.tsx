import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangleIcon } from './icons';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        // Attempting a full reload if the error was a chunk loading failure
        if (this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
            this.state.error?.message?.includes('Loading chunk') ||
            this.state.error?.name === 'ChunkLoadError') {
            window.location.reload();
        }
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const isNetworkError =
                this.state.error?.message?.includes('Failed to fetch') ||
                this.state.error?.message?.includes('Loading chunk') ||
                this.state.error?.name === 'ChunkLoadError' ||
                !navigator.onLine;

            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-6">
                        <AlertTriangleIcon className="w-12 h-12 text-red-500 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                        {isNetworkError ? 'Error de conexión' : '¡Ups! Algo salió mal'}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8">
                        {isNetworkError
                            ? 'Parece que no hay conexión a internet para descargar esta parte de la aplicación. Mantente conectado para usar funciones que aún no han sido guardadas en caché.'
                            : 'Ocurrió un error inesperado al intentar mostrar esta pantalla.'}
                    </p>
                    <div className="flex gap-4 flex-wrap justify-center">
                        <button
                            onClick={this.handleReset}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-colors"
                        >
                            Reintentar
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition-colors"
                        >
                            Volver al Inicio
                        </button>
                    </div>

                </div>
            );
        }

        return this.props.children;
    }
}
