import React, { useState, useEffect } from 'react';
import {
    ArrowRightFilled,
    CheckmarkCircleFilled,
    CalendarLtrRegular,
    BoardRegular,
    PersonRegular,
    SettingsRegular
} from '@fluentui/react-icons';

export const LandingPage: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 flex flex-col">

            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src="/logo.avif" alt="Regis Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
                        <span className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">Regis</span>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4">
                        <a href="/login" className="hidden md:block px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            Iniciar Sesión
                        </a>
                        <a href="/login" className="px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-105 active:scale-95">
                            Acceder
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-6 animate-fade-in-up">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                        Nuevo: Asistente IA Vicente 2.0
                    </div>

                    <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                        Gestión Docente, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                            Reinventada.
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Regis transforma la tediosa administración escolar en una experiencia fluida.
                        Asistencia ultrarrápida, calificaciones automáticas y planificación potenciada por IA.
                    </p>

                    <div className="flex flex-col w-full sm:w-auto sm:flex-row items-center justify-center gap-4 px-4">
                        <a href="/login" className="w-full sm:w-auto px-8 py-4 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl shadow-indigo-500/40 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2">
                            Empezar Ahora
                            <ArrowRightFilled fontSize={20} />
                        </a>
                        <a href="#features" className="w-full sm:w-auto px-8 py-4 text-base font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-full transition-all flex justify-center">
                            Ver Características
                        </a>
                    </div>

                    <div className="mt-16 relative mx-auto max-w-5xl rounded-2xl p-2 bg-gradient-to-b from-slate-200 to-transparent dark:from-slate-700">
                        <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-2xl">
                            <div className="w-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                <img
                                    src="/dashboard-preview.png"
                                    alt="Regis Dashboard Preview"
                                    className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { label: 'Docentes Activos', value: '500+' },
                        { label: 'Estudiantes Gestionados', value: '15k+' },
                        { label: 'Tiempo Ahorrado', value: '40%' },
                        { label: 'Disponibilidad', value: '99.9%' },
                    ].map((stat, i) => (
                        <div key={i}>
                            <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-1">{stat.value}</div>
                            <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Todo lo que necesitas en un solo lugar</h2>
                        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                            Diseñado pensando en la velocidad y la simplicidad para que puedas dedicar más tiempo a enseñar y menos a administrar.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<CheckmarkCircleFilled fontSize={32} />}
                            title="Asistencia Express"
                            description="Toma asistencia en segundos con nuestro modo rápido. Reportes automáticos de ausentismo y tardanzas."
                        />
                        <FeatureCard
                            icon={<BoardRegular fontSize={32} />}
                            title="Calificaciones Flexibles"
                            description="Libro de notas adaptable a cualquier esquema de evaluación. Promedios automáticos y recuperación."
                        />
                        <FeatureCard
                            icon={<SettingsRegular fontSize={32} />}
                            title="Vicente AI"
                            description="Tu asistente personal. Genera planificaciones, exámenes y correos a padres con un solo clic."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-600 dark:bg-indigo-700 -skew-y-3 transform origin-bottom-right scale-110 z-0"></div>
                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
                    <h2 className="text-4xl font-bold mb-6">¿Listo para modernizar tu aula?</h2>
                    <p className="text-indigo-100 text-lg mb-10">Únete a cientos de profesores que ya han simplificado su vida con Regis.</p>
                    <a href="/login" className="inline-block px-10 py-4 bg-white text-indigo-600 font-bold rounded-full text-lg shadow-xl hover:bg-indigo-50 transition-colors transform hover:-translate-y-1">
                        Crear Cuenta Gratis
                    </a>
                    <p className="mt-4 text-sm text-indigo-200 opacity-80">No requiere tarjeta de crédito • Plan gratuito de por vida disponible</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-4 text-white">
                            <img src="/logo.avif" alt="Regis" className="w-8 h-8 object-contain" />
                            <span className="font-bold text-lg">Regis</span>
                        </div>
                        <p className="max-w-xs text-sm">
                            Plataforma integral de gestión escolar diseñada para potenciar la labor docente con tecnología moderna.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Producto</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#features" className="hover:text-white transition-colors">Características</a></li>
                            <li><a href="/login" className="hover:text-white transition-colors">Precios</a></li>
                            <li><a href="/login" className="hover:text-white transition-colors">Vicente AI</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/privacy" className="hover:text-white transition-colors">Privacidad</a></li>
                            <li><a href="/terms" className="hover:text-white transition-colors">Términos</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-slate-800 text-xs text-center md:text-left flex flex-col md:flex-row justify-between items-center">
                    <p>&copy; {new Date().getFullYear()} Regis App. Todos los derechos reservados.</p>
                    <p className="mt-2 md:mt-0">Hecho con ❤️ para la educación.</p>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl dark:hover:shadow-indigo-900/10 hover:-translate-y-1 transition-all duration-300">
        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-6">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {description}
        </p>
    </div>
);
