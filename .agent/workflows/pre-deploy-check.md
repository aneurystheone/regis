---
description: Verificación completa antes de cualquier deploy (beta o prod)
---

# Workflow: Pre-Deploy Check

Llamado internamente por `/deploy-beta` y `/deploy-prod`. También puedes invocarlo manualmente con `/pre-deploy-check`.

## Propósito
Garantizar que el código es seguro para enviarse a usuarios reales. Este workflow no hace ningún deploy — solo valida.

## Pasos

### 1. Correr tests y validar tipos
// turbo
```powershell
npm run check
```
**Criterio de éxito**: Todos los tests pasan y TypeScript no reporta errores de tipos.

### 2. Verificar el modo de build
Confirmar que el build fue generado con modo `production`:
```powershell
npm run build:prod
```
> ⚠️ **Nunca usar `npm run build`** (modo development) para deploys a beta o producción. Causa "Site not found" porque Vite toma `.env.development` en lugar de `.env.production`, apuntando al proyecto Firebase incorrecto.

### 3. Auditar reglas de Firestore
Revisar `firestore.rules` y `storage.rules` buscando estas líneas peligrosas:
```
allow write: if true;
allow read: if true;
```
Si existen, **detener el deploy** y corregir antes de continuar.

### 4. 🔐 Escaneo de seguridad — verificar que no hay API keys en el bundle
Después del build, confirmar que ningún archivo JS en `dist/` contiene una API key:
```powershell
Select-String -Path "dist\assets\*.js" -Pattern "AIzaSy"
```
**Criterio de éxito**: Sin resultados. Si retorna líneas, el build contiene una key expuesta — **detener el deploy y revisar `vite.config.ts` y los archivos `.env`.**

> 🔴 Lección aprendida (agosto 2026): La Gemini API Key estaba embebida en el bundle vía `vite.config.ts` `define`. Causó la suspensión del proyecto por abuso. La key ahora vive SOLO en Firebase Functions (`process.env.GEMINI_API_KEY`).

### 5. Verificar variables de entorno
Confirmar que `.env.production` tiene todas las variables requeridas:
- `VITE_FIREBASE_API_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PRICE_ID_PREMIUM_MONTHLY`
> ℹ️ `VITE_GEMINI_API_KEY` fue removida intencionalmente — la key vive en Firebase Functions, no en el cliente.

### 5. Verificar APP_VERSION
Confirmar que `APP_VERSION` en `types.ts` refleja la versión que se va a desplegar.
Si no está actualizada, correr:
```powershell
npx tsx scripts/update-version.ts <X.Y.Z>
```

### 6. Revisión rápida de CHANGELOG.md
Confirmar que hay una entrada para la versión actual con los cambios del ciclo.

---
> ✅ Si todos los pasos pasan: el código está listo para deploy.
> 🛑 Si cualquier paso falla: corregir antes de proceder.
