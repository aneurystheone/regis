import React from 'react';

export const TermsPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-12 px-6">
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8 md:p-12">
                <h1 className="text-3xl font-bold mb-2 text-indigo-600 dark:text-indigo-400">Términos de Servicio</h1>
                <p className="text-sm text-slate-500 mb-8">Última actualización: {new Date().toLocaleDateString()}</p>

                <div className="prose dark:prose-invert max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. Aceptación de los Términos</h2>
                        <p>
                            Al registrarse y utilizar <strong>Regis</strong>, usted acepta cumplir con estos Términos de Servicio. Si no está de acuerdo con alguna parte, no debe utilizar nuestros servicios.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">2. Descripción del Servicio</h2>
                        <p>
                            Regis es una plataforma de software diseñada para asistir a docentes en la gestión de aulas, calificaciones, asistencia y planificación.
                            Incluye herramientas automatizadas y asistencia basada en Inteligencia Artificial ("Vicente").
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">3. Responsabilidades del Usuario</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Confidencialidad:</strong> Usted es responsable de mantener la confidencialidad de los datos de sus estudiantes ingresados en la plataforma, cumpliendo con las regulaciones locales de protección de datos educativos.</li>
                            <li><strong>Seguridad de la Cuenta:</strong> Usted es responsable de todas las actividades que ocurran bajo su cuenta.</li>
                            <li><strong>Uso Aceptable:</strong> No debe utilizar el servicio para fines ilegales o no autorizados.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">4. Descargo de Responsabilidad sobre IA</h2>
                        <p>
                            El asistente virtual "Vicente" utiliza tecnología de Inteligencia Artificial generar sugerencias.
                            <strong>Importante:</strong> La IA puede cometer errores. Usted reconoce que:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Las sugerencias de planificación, evaluación y resúmenes son solo ayudas y no reemplazan su juicio profesional.</li>
                            <li>Debe revisar y validar cualquier contenido generado por la IA antes de utilizarlo o compartirlo.</li>
                            <li>Regis no se hace responsable por decisiones tomadas basándose únicamente en sugerencias de la IA.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">5. Propiedad Intelectual</h2>
                        <p>
                            El software, diseño, logotipos y código de Regis son propiedad exclusiva de Regis App. El contenido que usted ingresa (datos de estudiantes, planificaciones propias) sigue siendo de su propiedad.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">6. Limitación de Responsabilidad</h2>
                        <p>
                            En la medida máxima permitida por la ley, Regis no será responsable de daños indirectos, incidentales o consecuentes derivados del uso o la imposibilidad de uso del servicio, incluyendo la pérdida de datos.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">7. Modificaciones</h2>
                        <p>
                            Nos reservamos el derecho de modificar estos términos en cualquier momento. Le notificaremos sobre cambios significativos a través de la plataforma o por correo electrónico.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <a href="/" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-2">
                        ← Volver al inicio
                    </a>
                </div>
            </div>
        </div>
    );
};
