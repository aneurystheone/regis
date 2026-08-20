# Estrategia Integral de Onboarding (The AHA! Path)

> **Estado**: ✅ Implementado (v1.8.0 — 2026-03-08)
> **Objetivo**: Transformar el alta de nuevos usuarios desde un formulario de recolección de datos masivo hacia un "Workflow Guiado" que demuestre valor inmediato y evite la deserción.

---

## 1. El Problema Actual

El flujo de `OnboardingWizard.tsx` (9 pasos secuenciales) presenta riesgos tanto de UX como técnicos:
*   **Riesgo de Deserción**: Pedir configuración de perfil, escaneo de horarios, estudiantes, y criterios de evaluación antes de usar la app genera fatiga.
*   **Vulnerabilidad Técnica**: Toda la data reside en la memoria volátil de React (`useState`). Si el navegador suspende la pestaña o el usuario recarga accidentalmente (F5) en el paso 8, pierde el 100% de su progreso.
*   **Falta de Gratificación**: El usuario hace el trabajo pesado antes de experimentar el poder de la Inteligencia Artificial (Vicente).

## 2. Visión del Nuevo Onboarding (Zero to Hero)

Dividiremos la experiencia en **dos fases integradas** utilizando la interfaz de usuario real de la aplicación, guiando al docente hacia su primer resultado tangible (un reporte o instrumento) en los primeros 10 minutos.

### Fase 1: El Setup Core (El Baseline Estricto)
**Cuándo ocurre**: En el primer inicio de sesión (Pantalla vacía).
**Objetivos**: Crear el contexto necesario para que el Dashboard funcione y dar el primer momento "Wow".

1.  **Perfil y Contexto**: Nombre, Rol, Regional y Distrito.
2.  **La Magia del Horario**: Pantalla de "Sube tu horario y deja que Vicente haga la magia". El sistema escanea la imagen y extrae el JSON usando `extractScheduleFromImage`.
3.  **Aprobación Instantánea**: Se muestran las clases extraídas, el docente confirma (o ajusta), y hace clic en "Entrar al Registro".
4.  *(Acción Oculta)*: Se ejecuta `api.addClass` secuencialmente garantizando persistencia en IndexedDB antes de avanzar.

**Resultado Fase 1**: El usuario entra al Dashboard principal y *ya tiene todas sus clases creadas* instantáneamente. Primer momento "Aha!".

### Fase 2: Misiones de Acción (Checklist de Valor)
**Cuándo ocurre**: Persistente en el Dashboard hasta que se completa.
**Diseño**: Un componente atractivo `MissionChecklist` en el área superior del Dashboard. Al hacer clic en una misión, no se abre un formulario del onboarding, sino que se navega **al módulo real** de la aplicación, guiando al docente sobre cómo usarlo.

| Misión | Acción Real en UI | Resultado Esperado | Beneficio Demostrado |
| :--- | :--- | :--- | :--- |
| **1. Tu primer curso** | Completado en Fase 1 | Clases en DB | "No tuve que teclear mi horario" |
| **2. Reclutando Estudiantes** | Abre `StudentImportModal` (IA/Excel) | Lista importada | "Añadir 40 niños tomó 2 segundos" |
| **3. La Primera Asistencia** | Navega a Vista Detalle -> Pasar Lista | 1 registro de Asistencia | "Un clic para todos presentes" |
| **4. Asistente de Evaluación** | Abre `AddInstrumentModal` (Vicente) | 1 Instrumento creado | "La IA me hizo los indicadores" |
| **5. Cosechando Resultados** | Navega a `Reports.tsx` -> Generar | Muestra PDF + Confeti 🎉 | "Magia: El reporte se hace solo" |

---

## 3. Plan de Implementación Técnica

### A. Estado Global de Misiones
Ampliar el manejador de estados o crear colección en Firestore (`users/{uid}/teacher_profile` o `usage_sessions`) para persistir:
```typescript
interface OnboardingMissions {
    profileSetup: boolean;
    classesCreated: boolean;
    studentsImported: boolean;
    firstAttendance: boolean;
    firstInstrument: boolean;
    firstReport: boolean;
}
```

### B. Modificación de Modales Existentes
Los componentes core (`AddStudentModal`, `AttendanceManager`, `AddInstrumentModal`, y `Reports`) deberán interceptar la finalización exitosa (el momento en que llaman a `api.add...`) y verificar si necesitan despachar un evento o modificar el estado global para "Tachar" esa misión de la lista.

### C. Refactorización del `SetupWizard.tsx` (Fase 1)
El `SetupWizard` será el único guardián de la Fase 1:
*   [x] Arreglar la vulnerabilidad crítica detectada por la auditoría: conectar el callback del ScheduleScanner (`newClasses`) directamente a múltiples promesas `api.addClass` y usar `await` antes de llamar a `onComplete()`.
*   [x] Remodelar visualmente este Wizard como el punto de entrada oficial pos-registro, eliminando el antiguo y pesado `OnboardingWizard.tsx`.

### D. Componente `MissionChecklist.tsx`
*   Diseñar un widget para el `Dashboard.tsx` que lea el estado `OnboardingMissions`.
*   Añadir botones "Ir" que utilicen la lógica de navegación basada en estado de la app (`setCurrentView`, `setSelectedClass`) para llevar al usuario directamente al punto de acción.

---

## 4. Criterios de Éxito
1.  **Reducción de Fatiga**: El tiempo para entrar al Dashboard post-registro debe ser menor a 2 minutos.
2.  **Cero Pérdida de Datos**: Todas las misiones de la Fase 2 guardan datos directamente en `api.ts` (IndexedDB/Firestore), por lo que cerrar la app en cualquier momento es 100% seguro.
3.  **Activación Exitosa**: Un usuario se considera "completamente onboardeado" solo cuando marca su asistencia, hace un instrumento, y ve el reporte final (Momento "Aha!").
