
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
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setError('');
    setIsLoading(true);
    try {
      if (provider === 'google') await authService.loginWithGoogle();
      if (provider === 'facebook') await authService.loginWithFacebook();
      if (provider === 'apple') await authService.loginWithApple();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('Ya existe una cuenta con este email usando otro método de acceso.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        // Ignore
      } else {
        setError('Error al iniciar sesión con ' + provider + '. Intente de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => handleSocialLogin('google');
  const handleFacebookLogin = () => handleSocialLogin('facebook');
  const handleAppleLogin = () => handleSocialLogin('apple');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authService.resetPassword(resetEmail);
      alert('Se ha enviado un correo de recuperación a ' + resetEmail);
      setIsResetOpen(false);
      setResetEmail('');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        alert('No existe una cuenta con este correo.');
      } else {
        alert('Error al enviar el correo. Intente más tarde.');
      }
    }
  };

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

          {isLoginView && (
            <button onClick={() => setIsResetOpen(true)} className="text-xs text-slate-500 hover:text-indigo-500 mb-6 block mx-auto underline">
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
            <span className="bg-white dark:bg-slate-800 px-3 text-xs text-slate-500 uppercase tracking-widest absolute">o continúa con</span>
          </div>

          <div className="flex justify-center gap-4 mb-6">
            <button type="button" onClick={handleGoogleLogin} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full transition-colors" title="Google">
              <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#DB4437" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.013-1.133 8.027-3.227 2.053-2.08 2.667-5.04 2.667-7.467 0-.747-.08-1.507-.213-2.387h-10.48z" /></svg>
            </button>
            <button type="button" onClick={handleAppleLogin} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full transition-colors" title="Apple">
              <svg className="w-6 h-6 text-black dark:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.21-.93 3.69-.76 1.48.16 2.69 1.3 3.48 2.31-2.9 1.44-2.58 6.13.9 7.72-.88 2.55-2.07 4.16-3.15 4.96zm-2.09-12.89c-.58-1.18.59-3.23 2.07-3.39.46 1.64-1.35 3.32-2.07 3.39z" /></svg>
            </button>
            <button type="button" onClick={handleFacebookLogin} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full transition-colors" title="Facebook">
              <svg className="w-6 h-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            </button>
          </div>

          <a href="https://www.regis-app.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-slate-400 hover:text-indigo-500 transition-colors">
            www.regis-app.com <LinkIcon className="w-3 h-3 ml-1" />
          </a>
        </div>
      </div>
      <p className="mt-8 text-xs text-slate-500 dark:text-slate-600">© 2024 Regis. Todos los derechos reservados.</p>

      {/* Reset Password Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm animate-fade-in-up">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Recuperar Contraseña</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <input type="email" required placeholder="tu@email.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsResetOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium">Enviar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
