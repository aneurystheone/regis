
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

  React.useEffect(() => {
    document.body.classList.add('show-recaptcha');
    return () => {
      document.body.classList.remove('show-recaptcha');
    };
  }, []);

  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleSocialLogin = async (provider: 'google') => {
    setError('');
    setIsLoading(true);
    try {
      if (provider === 'google') await authService.loginWithGoogle();
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
    <div className="flex flex-col md:flex-row min-h-screen bg-white dark:bg-slate-950 overflow-hidden">
      {/* Left Panel - Branding/Info (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-brand-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 max-w-lg text-center">
          <div className="mb-8 inline-block p-4 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 animate-float">
            <img src="/logo.png" alt="Regis Logo" className="w-24 h-24 object-contain" />
          </div>
          <h2 className="text-5xl font-bold text-white mb-6 tracking-tight">Regis</h2>
          <p className="text-xl text-indigo-100 leading-relaxed opacity-90">
            La plataforma inteligente diseñada para potenciar la labor docente y transformar la gestión escolar.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-6 text-left">
            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
              <SparklesIcon className="w-6 h-6 text-teal-400 mb-2" />
              <h4 className="text-white font-medium">Asistencia IA</h4>
              <p className="text-sm text-indigo-200/70">Automatiza tus tareas diarias.</p>
            </div>
            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
              <BookOpenIcon className="w-6 h-6 text-indigo-400 mb-2" />
              <h4 className="text-white font-medium">Control Total</h4>
              <p className="text-sm text-indigo-200/70">Gestión de clases y estudiantes.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Branding */}
          <div className="md:hidden text-center mb-8">
            <img src="/logo.png" alt="Regis Logo" className="w-20 h-20 object-contain mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Regis</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Productividad en tus manos.</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-200 dark:border-slate-700 relative overflow-hidden">
            <div className="mb-8 hidden md:block">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {isLoginView ? 'Bienvenido de nuevo' : 'Crear una cuenta'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                {isLoginView ? 'Ingresa tus credenciales para continuar.' : 'Únete a la comunidad de docentes Regis.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-xl text-sm text-center">{error}</p>}

              {!isLoginView && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Nombre</label>
                  <input id="name" name="name" type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Correo Electrónico</label>
                <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
              </div>
              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Contraseña</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
              </div>

              <div className="space-y-4 pt-2">
                <button type="submit" disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                  {isLoading ? 'Procesando...' : (isLoginView ? 'Iniciar Sesión' : 'Crear Cuenta')}
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
                  <span className="bg-white dark:bg-slate-800 px-3 text-xs text-slate-400 uppercase tracking-widest absolute">o accede rápido</span>
                </div>

                <button
                  type="button"
                  onClick={handleDemoAccess}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center py-3 px-4 border-2 border-teal-500/30 rounded-xl shadow-sm text-sm font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all"
                >
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Modo Demo (Acceso Instantáneo)
                </button>
              </div>
            </form>

            <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-700 pt-6">
              <button onClick={toggleView}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 block mx-auto transition-colors">
                {isLoginView ? '¿No tienes una cuenta? Regístrate' : '¿Ya tienes una cuenta? Inicia sesión'}
              </button>

              {isLoginView && (
                <button onClick={() => setIsResetOpen(true)} className="text-xs text-slate-400 hover:text-indigo-500 mt-4 block mx-auto transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              )}

              <div className="relative flex items-center justify-center my-6">
                <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
                <span className="bg-white dark:bg-slate-800 px-3 text-xs text-slate-400 uppercase tracking-widest absolute">o continúa con</span>
              </div>

              <div className="flex justify-center mb-6">
                <button type="button" onClick={handleGoogleLogin} className="flex items-center gap-3 px-6 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm hover:shadow-md" title="Google">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#DB4437" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.013-1.133 8.027-3.227 2.053-2.08 2.667-5.04 2.667-7.467 0-.747-.08-1.507-.213-2.387h-10.48z" /></svg>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Google</span>
                </button>
              </div>

              <div className="flex flex-col items-center gap-2">
                <a href="https://www.regis-app.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-slate-400 hover:text-indigo-500 transition-colors">
                  www.regis-app.com <LinkIcon className="w-3 h-3 ml-1" />
                </a>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-tighter">© 2024 Regis. Todos los derechos reservados.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
