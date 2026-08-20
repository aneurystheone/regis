# Changelog

## [1.8.9] - 2026-08-19
### Fixed & Hardened
- **Cloud Functions (SDK v1 & Tipos)**: Corrección de importación explícita a `firebase-functions/v1` en `functions/src/index.ts`, solucionando 23 errores de compilación causados por la actualización de `firebase-functions` a la versión `^6.0.0`.
- **Transacción Atómica de Referidos (`claimReferralCode`)**: Reestructuración de la función para ejecutar consultas de búsqueda fuera del bloque transaccional y efectuar bloqueos `transaction.get()` sobre las Suscripciones del Docente referente y referido, eliminando condiciones de carrera y sobreescrituras en `referralsCount` y `expiresAt`.
- **Secuencia y Timestamps en Webhooks de Stripe**: Integración del timestamp UNIX (`event.created`) y campo `lastStripeEventCreated` en `subscriptions`, descartando webhooks fuera de orden o desfasados que pudieran reactivar Suscripciones canceladas.
- **Preservación de `createdAt`**: Verificación previa en `handleCheckoutComplete` para que la fecha de registro de la Suscripción solo se defina en la creación inicial.
- **Optimización de Memoria en Backup Nocturno (`scheduledBackupToStandby`)**: Reemplazo de `.get()` masivo en memoria por `.count().get()` en las comprobaciones nocturnas para evitar desbordamiento de RAM (OOM > 512MB) y timeouts.

## [1.8.8] - 2026-08-18
### Added
- **Catálogo Centralizado de APIs**: Creación del módulo [`config/endpoints.ts`](file:///d:/Programs/Dev/regis/config/endpoints.ts) que cataloga de forma tipada las Cloud Functions (`callGemini`, `createCheckoutSession`, `createPortalSession`, `stripeWebhook`) e integraciones externas (Google GenAI, Stripe API, Firebase SDK). Integrado dinámicamente en la pestaña Proyecto del Panel de Administración.
- **Categorización en Configuración IA**: Agrupación limpia y estructurada de las capacidades de **Planificación** (Planificador de Clases) e **IA Vicente** (Alertas Proactivas y Chat) en `AISettings.tsx`.
- **TitleBar Dinámico de Suscripción**: `WindowsTitleBar.tsx` detecta el estado del **Plan Premium** a través de `SubscriptionContext`, mostrando el pill **✨ Premium** y ocultando el botón de actualización a Premium cuando el Docente cuenta con suscripción activa.

### Changed
- **Glosario Canónico en Telemetría**: Normalización terminológica en `LogViewer.tsx` reemplazando el término "Usuario" por **Docente**. Formateo apilado mostrando el nombre del Docente en negrita y su correo electrónico con Avatar representativo.

### Fixed & Optimized
- **Caché de Perfiles en Telemetría**: Implementación de `profileCache` en `LogViewer.tsx` para evitar solicitudes redundantes `getDoc(doc(db, 'teacher_profile', uid))` en refrescos o re-entradas a la vista de telemetría.
- **Error de Sintaxis en LogViewer**: Corrección del cierre de paréntesis en la función de renderizado `map` en `LogViewer.tsx`.

## [1.8.7] - 2026-08-18
### Security & Fixed
- **Firestore Rules Security**: Se actualizaron las reglas de lectura en `firestore.rules` para las subcolecciones de Estudiantes (`/students/{docId}/{allChildren=**}`) y listas masivas (`/lists/{listDocId}`), restringiendo el acceso únicamente al Docente propietario (`request.auth.uid`), plantilla demo o Administrador.
- **Aislamiento de Datos al Cerrar Sesión**: Se creó e implementó `clearAllLocalCache()` en `services/localCache.ts`, invocado dentro de `authService.logout()`, eliminando el caché en RAM (`memoryCache`) y la base de datos `IndexedDB` para evitar la exposición de datos pedagógicos en dispositivos compartidos.
- **Escrituras Idempotentes en Firestore**: Adición obligatoria de la opción `{ merge: true }` en todas las llamadas a `setDoc` y `batch.set` en `services/api.ts` y `services/curriculumService.ts` para prevenir la sobrescritura destructiva de documentos en sincronizaciones parciales u offline.

## [1.8.6] - 2026-08-08
### Fixed
- **Firestore Rules**: Se actualizaron las reglas de seguridad de Firestore para permitir a los usuarios crear su propio registro de suscripción (`free`) y actualizar campos de uso no confidenciales (como el contador de extracciones de estudiantes en Vicente Extractor y el código de referido) de manera segura y directa desde el cliente.
- **Pruebas Unitarias**: Corrección integral y estabilización de la suite de pruebas unitarias en Vitest para componentes core (`AttendanceManager`, `Reports`, `AddClassModal`, `ClassManager`).
- **Capacitor & Android Build**: Adición de `@emotion/is-prop-valid` y resolución de conflictos de dependencias en Capacitor v8 para empaquetado y construcción de APK Android.
- **Verificación Defensiva de Medios**: Verificación segura de `navigator.mediaDevices` y `getUserMedia` en `AddAnecdoteModal.tsx` para evitar crashes en conexiones HTTP inseguras o dispositivos sin hardware multimedia.
- **Electron White Flash Fix**: Corrección del parpadeo en blanco al inicializar la aplicación en escritorio mediante configuración de background color y revelado diferido (`ready-to-show`).
- **Animaciones de Modales**: Ajustes en animaciones de salida e interacción táctil en modales contextuales (`InstrumentsManagerModal`, modales 13 a 16).

## [1.8.5] - 2026-06-27
### Fixed
- **TeamBoard**: El arrastre de estudiantes no funcionaba en el APK (Android). Se agregó `TouchSensor` con `delay: 250ms` para distinguir correctamente tap de drag en pantallas táctiles (WebView de Capacitor).

## [1.8.4] - 2026-06-24
### Added
- **TeamBoard**: Nuevo componente `TeamBoard.tsx` para visualizar y administrar equipos de estudiantes. Integrado en `ExpressGrading` y `StudentManager`.

### Changed
- **Accesibilidad y Rendimiento**: Optimizaciones en toda la aplicación logrando métricas mejoradas (Accesibilidad a 93, Performance a 0.40, SEO a 1.0).
- **Gradebook Sticky Headers**: Optimizaciones de rendimiento de los encabezados fijos (sticky headers) en la vista del calificador para una mejor navegación.

### Fixed
- **Firestore Permission Error**: Corrección de problemas de permisos en las reglas de Firestore (VicenteSyncAlert/errores de acceso a colecciones).

## [1.8.3] - 2026-06-19
### Added
- **Multi-Student Anecdotes**: `StudentProfile.tsx` now scans for anecdotes sharing identical contents and timestamps across the student roster to display linked peers on the card label (e.g., `"Con: María Pérez, Juan Gómez"`).
- **Deterministic Tenant ID (`schoolId`)**: Formulates a deterministic `schoolId` based on district, school name, and school code to enforce school-level multi-tenancy.
- **Official Center Autocomplete**: Added searchable dropdown list for official schools under the selected district in the onboarding Setup Wizard and `TeacherProfile.tsx`.
- **Agenda Active Class Highlight**: The active class in `AgendaCard.tsx` is now highlighted when the current device time falls within the class time slot using a timezone-resilient checking algorithm (`isCurrentTimeInSlot`).
- **Regression Tests**: Added test suites for timezone-resilient attendance days rendering and multi-student anecdote link display.
- **Gradebook Mobile Controls**: Added icon-based toggle switch for mobile users to quickly alternate between Competency Group Averages and Individual Instrument Scores without horizontal scrolling. Added expanding magnifying glass for filtering students.

### Changed
- **Native Dialogs Replaced**: Migrated all remaining blocking `window.alert`, `window.confirm`, and `window.prompt` calls across the app (including `AttendanceManager` and `InstrumentsManagerModal`) to the customized asynchronous React hooks (`ConfirmDeleteModal`, etc.) to prevent browser extension (CORS/React Developer Tools) interference and improve UI consistency.
- **AddAnecdoteModal Layout**: Repositioned the media capture controls to a dedicated bottom toolbar (instead of floating over the textarea) to prevent camera and microphone icons from overlapping user typing.
- **Selective Image Source**: Clicking the camera button now opens a popover to prompt user to choose between "Cámara" (using native camera capture) and "Galería" (choosing from storage) via hidden reference-triggered input elements.
- **Onboarding Checklist Priority**: Sorted the dashboard mission checklist to prioritize uncompleted items and capped the display list to a maximum of 3 items.
- **Increased Class Limit**: Raised the free tier limit from `6` to `10` maximum active classes in `limits.ts` and `services/api.ts`.
- **Utility View State Retention**: Exiting utility pages (Settings, Profile, Recycle Bin) now redirects users back to their previously active main screen instead of resetting to the default Dashboard.
- **Persistent User Settings**: Standardized the logout sequence in `authService.ts` to preserve dark mode, font sizes, and active view states in local storage across sessions.
- **Attendance Timezone Shift Fix**: Date parsing inside `AttendanceManager.tsx` modified to append `'T12:00:00'` to date strings to eliminate timezone shifts where December 1st would render in November.
- **Schedule Scanner Enhancements**: Setup wizard schedule scanner updated to assign randomized course colors, format academic years (`YYYY-YYYY+1`), and apply fallback schedules for imported courses.

### Fixed
- **Competency Group Average Calculation**: Fixed a critical math flaw in `gradeHelpers.ts` and `useGradebookData.ts` where competency group averages incorrectly added raw scores instead of using percentage weights (`(scored/possible) * 100`). Also prevented instruments with no competencies assigned from being injected into all groups.
- **ExpressGrading Auto-Save Sync**: Repaired the `ExpressGradingModal` auto-save logic. Grades correctly save to Firestore in the background via debounce, and now instantly update the parent `GradebookManager` state on close, eliminating the need to manually refresh the page.
- **Gradebook Period Selector**: Fixed an issue where the selected evaluation period would incorrectly reset to the current period when changing courses in the Gradebook view, instead of preserving the user's selection.

## [1.8.2] - 2026-06-15
### Added
- **Feedback Manager Script**: New CLI tool (`scripts/feedback-manager.ts`) for triaging unsolved feedback tickets from Firestore. Scans the `feedback` collection, groups by severity (keyword-based), module (from `currentView`), and type, then batch-generates Markdown task files to `docs/generated/tasks/`. Supports interactive and auto modes. Run via `npm run feedback` or `npm run feedback:auto`.
- **npm scripts**: Added `feedback` and `feedback:auto` convenience scripts in `package.json`.

### Changed
- **Architecture Doc**: Updated `ARCHITECTURE.md` to document the new feedback manager script.
- **`.gitignore`**: Added `docs/generated/tasks/` to exclude ephemeral generated task files from version control.

## [1.8.1] - 2026-04-08
### Added
- **Diagnóstico de Datos**: Nueva función `diagnoseGhostGrades` en API para detectar inconsistencias en la base de datos (history vs document).
- **UpdatePrompt**: Sistema de notificación de actualizaciones mejorado, detectando versiones remotas en Firestore y actualizaciones de Service Worker.
- **VicenteSyncAlert**: Nueva alerta interactiva "Vicente informa" para errores de permisos en tiempo recordatorio de guardado local.
- **Sincronización de Grupos**: Manejo de `onUserGroupsChange` para soporte de grupos privados de usuarios en tiempo real.
- **Gestión de Versión**: Script `update-version.ts` integrado para automatizar el bump de versión y timestamp de build.
 
### Changed
- **Arquitectura Doc**: Actualización de la documentación técnica para reflejar el estado estable de la Fase II.
 

## [1.8.0] - 2026-03-08
### Added
- **Onboarding Completo**: `SetupWizard.tsx` (Fase 1: Perfil, Horario IA, Confirmación) + `MissionChecklist.tsx` (Fase 2: checklist gamificado en Dashboard con misiones de valor).
- **QRShareModal**: Modal para compartir enlaces de clase vía código QR.
- **ErrorBoundary**: Componente de captura de errores React a nivel de componente.
- **Edición de Perfil Docente**: `TeacherProfile.tsx` ahora permite editar especialización, años de experiencia, teléfono, regional, distrito y nombre de escuela.
- **Admin Dashboard (Datos Reales)**: Alertas de riesgo y logs del sistema ahora se obtienen de la colección `system_logs` de Firestore en tiempo real, reemplazando datos mock.

### Changed
- **Reportes (`Reports.tsx`)**: Header rediseñado al estilo Gradebook; selectores de estudiante/mes consolidados en modal contextual que aparece al seleccionar reporte; eliminados diálogos de confirmación; agregado estado de carga durante generación de PDF.
- **Gradebook Mobile**: Solo primer nombre en lista de estudiantes; icono de ellipsis vertical reemplaza "More Options"; botón RP consolidado con indicador visual de estado.
- **Gradebook Headers**: Eliminado icono de rayo; badge de puntos totales reducido; nombre del instrumento y puntos ahora son clickeables para abrir `InstrumentDetailModal`.
- **Sincronización Lazy**: Carga diferida de suscripciones de asistencia, notas diarias y anécdotas en `api.ts` para mejorar rendimiento de carga inicial (< 10s).
- **Onboarding**: Aparece solo una vez por cuenta; configuraciones pendientes integradas en `SetupWizard`; prevención de cursos duplicados; métricas funcionales.
- **`EditInstrumentModal`**: Eliminado selector de clase; toggle de sincronización reposicionado correctamente.
- **Instrument Modals**: Eliminados iconos de calendario duplicados; campo "Nombre del Instrumento" recibe foco automáticamente al abrir.

### Fixed
- **Agregación de Calificaciones**: Instrumentos con múltiples criterios ahora se agregan correctamente a grupos de competencia.
- **Competencias Wildcard**: Instrumentos sin competencia asignada se vinculan automáticamente a competencias wildcard disponibles; instrumentos existentes con competencias vacías se corrigen para evitar corrupción en promedios de grupo.
- **Gradebook Mobile**: Mensaje "No hay estudiantes en esta clase" ahora visible correctamente en dispositivos móviles.
- **`ExpressGradingModal`**: Lista de estudiantes se muestra correctamente al abrir desde el Dashboard.
- **Duplicación de Cursos**: Eliminada duplicación de entradas de curso durante onboarding.
- **`Reports.tsx` TypeScript**: Agregada prop `aiFeatures` a la interfaz `ReportsProps` para resolver error de compilación.

## [1.7.0] - 2026-02-28
### Added
- **Wizard Modals**: `AddInstrumentModal` and `EditInstrumentModal` refactored into 3-step wizards (Identificación, Currículo, Criterios) with inline stepper, slide animations, and AI-powered criteria generation.
- **InstrumentDetailModal**: Read-only modal for viewing evaluation instrument details.
- **GuidanceReferralModal**: School counselor referral workflow.
- **AddRecoveryGradeModal**: Pedagogical recovery grade entry.
- **CopyCompetencyModal**: Duplicate competencies across classes.
- **Bulk Modals**: `EditStudentBulkModal` and `MoveStudentBulkModal` for batch student operations.
- **Test Suites**: Added `GradebookManager.test.tsx`, `ClassManager.test.tsx`, and `Reports.test.tsx`.
- **ProfileDropdownMenu**: User avatar dropdown for quick actions.
- **AgendaCard**: Calendar event card component with test.

### Changed
- **GradebookManager Toolbar**: Reordered controls on tablet/PC: Periodo (Resumen anual, Período 1…) → Competencias (flexible) → Recuperación (RP) → Más opciones (⋮).
- **Date Format**: Instrument date fields now display as `dd/mm/yyyy` (e.g., `27/02/2026`) with a calendar icon.
- **Mobile Layout**: Tipo + Periodo and Fecha + Puntos always on same row (2-column grid, no breakpoint collapse).
- **Period Labels**: Updated select options from `P1` to `Período 1` and `Resumen` to `Resumen anual` for clarity.
- **Feedback Modal**: Renamed to "Buzón de sugerencias", added duplicate prevention.
- **EditInstrumentModal**: Fully rewritten to match AddInstrumentModal wizard structure.

### Fixed
- **Form Submission Bug**: Removed `<form>` wrapper from wizard modals. Submit via `type="button" onClick={handleSubmit}` on Step 3 only, preventing premature submission when navigating steps.
- **CompetenciesManagerModal**: Instruments grouped correctly, unmapped instruments fall under "Sin Grupo".
- **Wildcard Competency Mapping**: Fixed recognition of `PC1-classId` patterns in competency groups.

## [1.6.4] - 2026-02-07
### Added
- **Battery Optimization**: Implemented 3-phase optimization plan (Connection Monitor, Smart Backup, Lazy Grade Subscription) to reduce battery usage.
- **Mobile Admin**: Added dedicated Admin button in the mobile bottom navigation for administrators.

### Changed
- **Competency Grouping**: Adjusted primary school competency grouping (G2: Math/Science, G3: Ethics/Environmental) to align with official curriculum.
- **Landing Page**: Updated landing page with actual dashboard screenshot.

## [1.6.3] - 2026-02-04
### Added
- **Branded Reports (Free Tier)**: Customized report headers for free users with Regis logo, watermark, and clickable website link.
- **Admin Feedback**: Improved feedback management with filters (Type, Status, Date) and search functionality.
- **Environment**: Added `pro-regis` hosting target for production.

### Changed
- **Report Styling**: Standardized "AliceBlue" branding across all free version reports (Attendance, Grades, Summary).
- **Attendance Reports**: Updated "Present" symbol from `.` to `P` and improved text contrast.

### Fixed
- **PDF Generation**: Resolved race condition in asynchronous header loading (logo/QR code).
- **Offline Mode**: Suppressed false positive reCAPTCHA errors when offline.
- **Version Control**: Fixed production hosting target in `.firebaserc`.

## [1.6.0] - 2026-02-02
### Added
- **Admin Dashboard**: New comprehensive dashboard for metrics, AI settings, and system monitoring.
- **Beta Environment**: Full redundant deployment target (`beta-regis.web.app`) with separate hosting but shared production database.
- **Subcollection Migration**: Migrated grades from monolithic `lists` collection to scalable `instruments/{id}/grades/{studentId}` subcollections.
- **Build Timestamp**: Added visual deployment timestamp in Admin Dashboard.

### Changed
- **Data Architecture**: Shifted from large single-document grade lists to subcollections for performance and scalability.
- **Security Rules**: Updated `firestore.rules` to support granular subcollection access.

## [1.5.0] - 2026-01-30
### Added
- **Offline Mode**: Robust offline support with local conflict resolution.
- **Emergency Backups**: LocalStorage backup system for critical grade data.

## [1.4.0] - 2026-01-15
### Changed
- **Attendance Module**: Optimized FAB interactions and resolved white-screen crashes.
- **Performance**: Improved grade grid rendering performance on mobile devices.

## [1.3.0] - 2026-01-01
### Added
- **Subscription System**: Integration with Stripe for Premium tiers.
- **Role-Based Access**: Strict teacher vs admin separation.

## [1.0.0] - 2025-12-01
### Added
- Initial Release of Regis PWA.
