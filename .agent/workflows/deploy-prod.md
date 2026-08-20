---
description: Desplegar una versión validada a Producción
---

# Workflow: Deploy Producción

⚠️ **Este workflow requiere que el deploy beta haya sido validado primero.**

## Pre-condiciones
- `/deploy-beta` se completó exitosamente
- Los beta testers confirmaron que los flujos core funcionan
- No hay bugs críticos pendientes

## Pasos

### 1. Confirmar validación beta
Verificar que los 3 flujos core fueron confirmados en beta:
- [ ] Autenticación
- [ ] Asistencia
- [ ] Calificación

Si no fueron validados, **detener y volver a `/deploy-beta`**.

### 2. Ejecutar Lighthouse Audit
```powershell
.\scripts\lighthouse-audit.ps1
```
Revisar el reporte generado. El score de Performance debe ser ≥ 90.

### 3. Verificar cambios en reglas de Firestore
```powershell
git diff firestore.rules storage.rules
```
Si hay cambios en las reglas:
> ⚠️ **REQUIERE APROBACIÓN MANUAL** antes de continuar.

Desplegar reglas por separado:
```powershell
npm run deploy:rules:prod
```

### 4. Build final
// turbo
```powershell
npm run build:prod
```
> ⚠️ **Importante**: Usar siempre `build:prod` (no `build`) para que Vite tome `.env.production`. El mismo error que causó "Site not found" en beta puede ocurrir en producción si se usa el modo incorrecto.

### 5. Deploy a producción

> 🛑 **PASO CRÍTICO — NO AUTO-EJECUTAR**

```powershell
npm run deploy:web:prod
```

### 6. Verificar en producción
Abrir `teacher-productivity-kit.web.app` y verificar:
- [ ] `APP_VERSION` visible en Admin Dashboard refleja la versión correcta
- [ ] Login funciona
- [ ] Un flujo core completo (Asistencia o Calificación)

### 7. Monitorear logs post-deploy
En el Admin Dashboard → Log Viewer, revisar los primeros 15 minutos buscando:
- Errores de permisos Firebase
- Errores de sincronización
- Crashes en flujos core

---
> 🔴 **Si algo falla post-deploy**: No hacer rollback inmediato. Diagnosticar primero en Admin Dashboard. El rollback elimina datos de Docentes activos.
