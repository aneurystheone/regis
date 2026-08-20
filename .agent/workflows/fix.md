---
description: Corregir un bug reportado en REGIS
---

# Workflow: Corrección de Bug

Usa este workflow cuando se reporta un error — por ti, por un beta tester, o por un log en producción.

## Pre-condiciones
- Tienes descripción del bug: qué pasó, qué se esperaba, pasos para reproducir

## Pasos

### 1. Diagnóstico con el Auditor
Invocar skill `Auditor` para analizar el error antes de tocar código.
Identificar: ¿es UI? ¿servicio? ¿lógica de datos? ¿reglas de Firestore?

### 2. Reproducir localmente
```powershell
npm run dev
```
Confirmar que puedes reproducir el bug en `localhost:5173`.
Si no puedes reproducirlo, **no arregles** hasta entender por qué.

### 3. Identificar o crear un test que falle
Si existe un test relacionado, verificar que falla con el bug presente.
Si no existe, escribir uno mínimo en `tests/` o `services/*.test.ts`.

```powershell
npm run test -- --run
```

### 4. Aplicar el fix mínimo
- Fix enfocado: **no refactorizar** mientras corriges un bug
- Si el fix requiere cambios en `firestore.rules` o `types.ts` (campos obligatorios): escalar a revisión humana
- Si toca flujo de Calificación, Asistencia o Sincronización: revisar principios offline-first

### 5. Verificar que el test ahora pasa
// turbo
```powershell
npm run test -- --run
```

### 6. Verificar comportamiento offline (si aplica)
Si el bug tocó sincronización, IndexedDB, o escritura a Firestore:
- Simular offline en DevTools
- Confirmar que el fix no introduce nuevos riesgos de pérdida de datos

### 7. Actualizar CHANGELOG.md
Añadir entrada en la sección `### Fixed` de la versión actual:
```markdown
- **[Componente]**: Descripción breve del bug corregido.
```

---
> ⚠️ **Principio clave**: Un bug en datos (Calificación, Asistencia) es siempre prioridad alta. Un bug visual puede esperar.
