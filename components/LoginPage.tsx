
import React, { useState } from 'react';
import { BookOpenIcon, SparklesIcon, LinkIcon } from './icons';
import { authService } from '../services/authService';


import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

interface LoginPageProps {
  onLogin: (email: string, pass: string) => Promise<boolean>;
  onSignUp: (name: string, email: string, pass: string) => Promise<boolean>;
}

export const LoginPage: React.FC<LoginPageProps> = () => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!executeRecaptcha) {
        console.warn('Execute recaptcha not yet available');
        // Allow to proceed or return? Proceeding potentially allows bypass if script fails.
      } else {
        const token = await executeRecaptcha(isLoginView ? 'login' : 'signup');
        console.log('ReCaptcha Token generated:', token);
        // Here you would send the token to your backend for verification
      }

      if (isLoginView) {
        await authService.login(email, password);
      } else {
        if (name.trim() === '') {
          setError('El nombre es obligatorio.');
          setIsLoading(false);
          return;
        }
        await authService.signUp(name, email, password);
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'Ocurrió un error inesperado.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Correo o contraseña incorrectos.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'El correo electrónico ya está en uso.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña es muy débil (mínimo 6 caracteres).';
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setError('');
    setIsLoading(true);
    try {
      await authService.loginDemo();
    } catch (err) {
      setError('No se pudo iniciar el modo demo. Intente de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Regis Logo" className="w-24 h-24 object-contain mx-auto mb-4" />
          <h1 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mt-4">Regis</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Productividad en tus manos.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm text-center">{error}</p>}

          {!isLoginView && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Nombre</label>
              <input id="name" name="name" type="text" required value={name} onChange={e => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Correo Electrónico</label>
            <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Contraseña</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>

          <div className="space-y-4">
            <button type="submit" disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition-all">
              {isLoading ? 'Procesando...' : (isLoginView ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
              <span className="bg-white dark:bg-slate-800 px-3 text-xs text-slate-500 uppercase tracking-widest absolute">o</span>
            </div>

            <button
              type="button"
              onClick={handleDemoAccess}
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 border-2 border-teal-500 rounded-md shadow-sm text-sm font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all"
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Probar Demo (Sin registro)
            </button>
          </div>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-700 pt-6">
          <button onClick={toggleView}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 mb-4 block mx-auto">
            {isLoginView ? '¿No tienes una cuenta? Regístrate' : '¿Ya tienes una cuenta? Inicia sesión'}
          </button>

          <a href="https://www.regis-app.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-slate-400 hover:text-indigo-500 transition-colors">
            www.regis-app.com <LinkIcon className="w-3 h-3 ml-1" />
          </a>
        </div>
      </div>
      <p className="mt-8 text-xs text-slate-500 dark:text-slate-600">© 2024 Regis. Todos los derechos reservados.</p>
    </div>
  );
};
