import React from 'react';

export const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-12 px-6">
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8 md:p-12">
                <h1 className="text-3xl font-bold mb-2 text-indigo-600 dark:text-indigo-400">Política de Privacidad</h1>
                <p className="text-sm text-slate-500 mb-8">Última actualización: {new Date().toLocaleDateString()}</p>

                <div className="prose dark:prose-invert max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. Introducción</h2>
                        <p>
                            Bienvenido a <strong>Regis</strong> ("nosotros", "nuestro"). Respetamos su privacidad y estamos comprometidos a proteger la información personal que comparte con nosotros.
                            Esta política explica cómo recopilamos, usamos y protegemos sus datos al utilizar nuestra plataforma de gestión escolar y asistente docente.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">2. Información que Recopilamos</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Datos del Docente (Usuario):</strong> Nombre, dirección de correo electrónico, foto de perfil (si se proporciona) y credenciales de autenticación.</li>
                            <li><strong>Datos de Estudiantes:</strong> Nombres, calificaciones, registros de asistencia, observaciones y contenido multimedia (fotos de listas, audios de anécdotas) subido por el docente.</li>
                            <li><strong>Datos de Uso:</strong> Información sobre cómo interactúa con la aplicación, funciones utilizadas y registros de errores para mejorar el servicio.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">3. Uso de la Información</h2>
                        <p>Utilizamos la información recopilada para:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Proveer, mantener y mejorar las funciones de Regis.</li>
                            <li>Procesar calificaciones y asistencia automáticamente.</li>
                            <li><strong>Funciones de IA (Vicente):</strong> Procesar texto, imágenes y audio mediante modelos de Inteligencia Artificial (Google Gemini) para generar resúmenes, extraer listas y transcribir notas.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">4. Inteligencia Artificial y Terceros</h2>
                        <p>
                            Regis utiliza servicios de terceros para su funcionamiento:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Google Firebase:</strong> Para autenticación, base de datos y alojamiento seguro.</li>
                            <li><strong>Google Gemini API:</strong> Para las funciones de asistencia inteligente. Los datos enviados a la IA se utilizan únicamente para generar la respuesta solicitada y no se utilizan para entrenar modelos públicos de Google sin su consentimiento explícito.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">5. Seguridad de los Datos</h2>
                        <p>
                            Implementamos medidas de seguridad robustas, incluyendo encriptación en tránsito y en reposo, para proteger su información.
                            Sin embargo, ningún método de transmisión por Internet es 100% seguro.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">6. Sus Derechos</h2>
                        <p>
                            Usted tiene derecho a acceder, corregir o eliminar su información personal almacenada en Regis. Puede solicitar la eliminación de su cuenta y todos los datos asociados en cualquier momento contactando a nuestro soporte.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">7. Contacto</h2>
                        <p>
                            Si tiene preguntas sobre esta política, contáctenos en: <a href="mailto:soporte@regis.app" className="text-indigo-600 hover:underline">soporte@regis.app</a>
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
