---
description: Implementar una nueva feature en REGIS
---

# Workflow: Nueva Feature

Usa este workflow al inicio de cualquier nueva funcionalidad. Sigue los pasos en orden.

## Pre-condiciones
- El servidor de desarrollo ya está corriendo (`npm run dev`)
- Sabes el nombre del feature y su alcance

## Pasos

### 1. Leer las reglas del agente
Antes de escribir código, lee la sección `## 7. Rules for AI Agents` en `docs/ARCHITECTURE.md`.
Confirma en qué categoría cae el cambio: "Safe to Change", "Requires Human Approval", o "Critical Constraint".

### 2. Verificar el glosario
Consulta `.agent/GLOSSARY.md` para confirmar que los términos usados son canónicos.
Nunca introduzcas términos nuevos sin verificar primero.

### 3. Definir el tipo en types.ts
Si el feature requiere datos nuevos, añade la interfaz en `types.ts` como campo **opcional** para no romper producción.

### 4. Implementar en la capa de servicios
Añadir la lógica en `services/api.ts` o en el service específico correspondiente.
**NUNCA** acceder a Firestore directamente desde un componente.

### 5. Crear o actualizar el Manager component
Seguir el Manager Pattern: `[Feature]Manager.tsx` como contenedor principal.
Los modales van en archivos separados `[Feature]Modal.tsx`.

### 6. Correr los tests
// turbo
```powershell
npm run test -- --run
```
Los tests deben pasar sin fallos antes de continuar.

### 7. Verificar que el build compila
// turbo
```powershell
npm run build
```
No debe haber errores de TypeScript. Advertencias son aceptables con justificación.

### 8. Verificar comportamiento offline
Si el feature toca Asistencia, Calificación o Anécdotas:
- Desactiva la conexión en DevTools → Network → Offline
- Confirma que la UI no bloquea al usuario
- Reconecta y verifica sincronización

### 9. Actualizar la documentación
Invocar workflow `/update-docs` para dejar rastro del cambio.

---
> ⚠️ **Riesgo de datos**: Si el feature escribe en Firestore, confirma que el write pasa por `api.ts → handleWriteError`. Nunca escribir directamente.
