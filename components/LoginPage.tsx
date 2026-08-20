import React, { useState } from 'react';
import { authService } from '../services/authService';
import { trackLoginEvent } from '../services/analyticsService';
import { useGoogleReCaptcha, GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PersonRegular,
  KeyRegular,
  MailRegular,
  EyeRegular,
  EyeOffRegular,
  ArrowRightRegular,
  ArrowLeftRegular
} from '@fluentui/react-icons';
import { WindowsTitleBar } from './WindowsTitleBar';

interface LoginPageProps {
  onLogin: (email: string, pass: string) => Promise<boolean>;
  onSignUp: (name: string, email: string, pass: string) => Promise<boolean>;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

interface LoginPageContentProps extends LoginPageProps {
  executeRecaptcha?: (action?: string) => Promise<string>;
}

// True when the app is running inside the installed Electron build (app:// or file:// protocol)
const isElectronInstalled = typeof window !== 'undefined'
  && !!(window as any).electronAPI?.isElectron;

const getFriendlyErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    // --- Standard Firebase codes ---
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido.';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido deshabilitada.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.';
    case 'auth/wrong-password':
      return 'La contraseña es incorrecta.';
    case 'auth/email-already-in-use':
      return 'El correo ya está registrado.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Intente de nuevo más tarde o restablezca su contraseña.';
    case 'auth/network-request-failed':
      return 'Error de conexión. Verifique su acceso a Internet.';
    case 'auth/credential-already-in-use':
      return 'Esta cuenta ya está vinculada a otro usuario.';
    case 'auth/operation-not-allowed':
      return 'El método de inicio de sesión no está habilitado en Firebase.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Se cerró la ventana de inicio de sesión.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana emergente. Permita ventanas emergentes e intente de nuevo.';
    case 'auth/account-exists-with-different-credential':
      return 'Ya existe una cuenta con este email pero con otro método de acceso (Google/Email).';
    // --- Electron / file:// specific codes ---
    case 'auth/unauthorized-domain':
      return 'El dominio de la aplicación no está autorizado en Firebase. Contacte al administrador.';
    case 'auth/internal-error':
      return isElectronInstalled
        ? 'Error interno de Firebase. En la versión de escritorio, el inicio de sesión con Google requiere conexión a Internet y que el dominio esté autorizado.'
        : 'Error interno de Firebase. Intente de nuevo.';
    case 'auth/invalid-api-key':
      return 'La clave de configuración de Firebase no es válida. Contacte al administrador.';
    default:
      return `Error al iniciar sesión (${errorCode || 'desconocido'}). Intente de nuevo.`;
  }
};

export const LoginPageContent: React.FC<LoginPageContentProps> = ({ onLogin, onSignUp, addToast, executeRecaptcha }) => {

  React.useEffect(() => {
    if (executeRecaptcha) {
      document.body.classList.add('show-recaptcha');
      return () => { document.body.classList.remove('show-recaptcha'); };
    }
  }, [executeRecaptcha]);

  const [isLoginView, setIsLoginView] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // --- Handlers ---

  const handleToggleView = () => {
    setIsLoginView(!isLoginView);
    setStep(1);
    setError('');
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Por favor, ingresa un correo electrónico válido.');
      return;
    }
    if (!isLoginView && !name.trim()) {
      setError('Por favor, ingresa tu nombre completo.');
      return;
    }

    setStep(2);
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setError('');
    setIsLoading(true);
    try {
      if (provider === 'google') await authService.loginWithGoogle();
      else if (provider === 'facebook') await authService.loginWithFacebook();
      else if (provider === 'apple') await authService.loginWithApple();
      trackLoginEvent();
    } catch (err: any) {
      console.error(`${provider} login error:`, err);
      const msg = getFriendlyErrorMessage(err?.code);
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (executeRecaptcha) {
        await executeRecaptcha(isLoginView ? 'login' : 'signup');
      }

      if (isLoginView) {
        await authService.login(email, password);
        trackLoginEvent();
      } else {
        if (name.trim() === '') throw new Error('El nombre es obligatorio.');

        // Password Validation
        if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        if (!/\d/.test(password)) throw new Error('La contraseña debe incluir al menos un número.');

        await authService.signUp(name, email, password);
        trackLoginEvent();
      }
    } catch (err: any) {
      console.error('Auth error:', err?.code, err?.message, err);
      let msg: string;

      if (err.code) {
        msg = getFriendlyErrorMessage(err.code);
      } else if (err.message && !err.message.includes('Firebase')) {
        // Validation errors thrown by us (name, password rules)
        msg = err.message;
      } else {
        msg = 'Ocurrió un error inesperado. Intente de nuevo.';
      }

      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authService.resetPassword(resetEmail);
      setResetSuccess(true);
      // Removed toast to use explicit UI instead
    } catch (err) {
      addToast('Error al enviar correo.', 'error');
    }
  };

  const handleCloseReset = () => {
    setIsResetOpen(false);
    setResetSuccess(false);
    setResetEmail('');
  };

  // --- Render ---

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">
      <WindowsTitleBar minimal />

      <div className="flex-1 flex items-center justify-center p-4">
        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl flex overflow-hidden min-h-[600px]">

        {/* Left Side: Branding (Consistent with Landing Page) */}
        <div className="hidden md:flex w-1/2 bg-slate-100 dark:bg-slate-950 flex-col items-center justify-center p-12 relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-indigo-600/5 dark:bg-indigo-500/10"></div>
          {/* Decorative blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>

          <div className="relative z-10 flex flex-col items-center">
            <img src="./logo.avif" alt="Regis" className="w-24 h-24 object-contain mb-8 drop-shadow-xl" />
            <p className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Regis</p>
            <p className="text-lg text-slate-700 dark:text-slate-300 max-w-xs leading-relaxed">
              Tu asistente ideal para el aula. Gestión inteligente y simple.
            </p>
          </div>

          <div className="relative z-10 mt-12 space-y-4">
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-white/20 dark:border-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-3 w-64 text-left">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600"><PersonRegular fontSize={20} /></div>
              <span>Asistencia con un clic</span>
            </div>
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-white/20 dark:border-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-3 w-64 text-left">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600"><ArrowRightRegular fontSize={20} /></div>
              <span>Planificación con IA</span>
            </div>
          </div>
        </div>

        {/* Right Side: Simple Auth */}
        <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center bg-white dark:bg-slate-800 relative">

          <div className="max-w-sm mx-auto w-full">
            {/* Header */}
            <div className="mb-8 text-center md:text-left">
              <div className="md:hidden flex flex-col items-center justify-center mb-6">
                <img src="./logo.avif" alt="Regis" className="w-16 h-16 object-contain drop-shadow-md" />
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">Regis</p>
              </div>
              <h1 className="text-3xl font-bold mb-2 hidden md:block">{isLoginView ? 'Bienvenido' : 'Crear Cuenta'}</h1>
              <p className="text-slate-500 dark:text-slate-400">
                {isLoginView ? 'Ingresa para gestionar tus clases.' : 'Únete a la comunidad educativa.'}
              </p>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm rounded-lg text-center shadow-sm">{error}</div>}

            <div className="relative overflow-visible w-full min-h-[300px]">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full"
                  >
                    {/* Social Login - PRIORITY */}
                    <button
                      type="button"
                      onClick={() => handleSocialLogin('google')}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm hover:shadow-md group mb-6"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#DB4437" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.013-1.133 8.027-3.227 2.053-2.08 2.667-5.04 2.667-7.467 0-.747-.08-1.507-.213-2.387h-10.48z" /></svg>
                      <span className="font-semibold text-slate-700 dark:text-white group-hover:text-slate-900 group-disabled:opacity-50">
                        {isLoginView ? 'Continuar con Google' : 'Registrarse con Google'}
                      </span>
                    </button>

                    <div className="relative flex py-2 items-center mb-6">
                      <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                      <span className="flex-shrink-0 mx-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">o con Email</span>
                      <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                    </div>

                    <form onSubmit={handleNextStep} className="space-y-4">
                      {!isLoginView && (
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <PersonRegular />
                          </div>
                          <input type="text" placeholder="Nombre completo" required value={name} onChange={e => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-400 dark:text-white" />
                        </div>
                      )}

                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <MailRegular />
                        </div>
                        <input type="email" placeholder="Correo electrónico" required value={email} onChange={e => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-400 dark:text-white" />
                      </div>

                      <button type="submit"
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all transform active:scale-98 mt-2">
                        Continuar
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setError('');
                      }}
                      className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-6"
                    >
                      <ArrowLeftRegular /> Volver
                    </button>

                    <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{isLoginView ? 'Iniciando sesión como:' : 'Registrando como:'}</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate w-full">{email}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <KeyRegular />
                        </div>
                        <input type={showPassword ? "text" : "password"} placeholder="Contraseña" required value={password} onChange={e => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-400 dark:text-white" autoFocus />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                          {showPassword ? <EyeOffRegular /> : <EyeRegular />}
                        </button>
                      </div>

                      {/* Password Requirements (Sign Up Only) */}
                      {!isLoginView && (
                        <div className="text-xs space-y-1 ml-1 transition-all duration-300">
                          <p className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                            Mínimo 8 caracteres
                          </p>
                          <p className={`flex items-center gap-1.5 ${/\d/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${/\d/.test(password) ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                            Al menos 1 número
                          </p>
                        </div>
                      )}

                      <button type="submit" disabled={isLoading}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all transform active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed mt-2">
                        {isLoading ? 'Procesando...' : (isLoginView ? 'Ingresar' : 'Registrarse')}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="mt-8 text-center space-y-4">
              {isLoginView && (
                <button onClick={() => setIsResetOpen(true)} className="text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              )}
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {isLoginView ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                <button onClick={handleToggleView} className="ml-1 font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                  {isLoginView ? 'Regístrate' : 'Inicia Sesión'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 dark:border-slate-700">
            {resetSuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">¡Correo Enviado!</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Hemos enviado un enlace de recuperación a <strong>{resetEmail}</strong>.
                  <br /><br />
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Si no lo ve, por favor revise su carpeta de SPAM.</span>
                </p>
                <button onClick={handleCloseReset} className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors">
                  Aceptar
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-2">Recuperar Contraseña</h3>
                <p className="text-sm text-slate-500 mb-4">Ingresa tu email para recibir el enlace.</p>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <input type="email" required placeholder="Email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={handleCloseReset} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg">Cancelar</button>
                    <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Enviar</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

const ReCaptchaWrapper: React.FC<LoginPageProps> = (props) => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  return <LoginPageContent {...props} executeRecaptcha={executeRecaptcha} />;
};

export const LoginPage: React.FC<LoginPageProps> = (props) => {
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  const isNative = Capacitor.isNativePlatform();
  const isDesktop = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

  if (!recaptchaKey || isNative || isDesktop) {
    if (isNative || isDesktop) {
      console.log("Running in Capacitor/Electron native mode. ReCaptcha is disabled to prevent WebView domain blocking.");
    } else {
      console.warn("VITE_RECAPTCHA_SITE_KEY is missing. ReCaptcha will not work.");
    }
    // Fallback if no key or in native context where domain is not allowlisted
    return <LoginPageContent {...props} />;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={recaptchaKey}
    >
      <ReCaptchaWrapper {...props} />
    </GoogleReCaptchaProvider>
  );
};
