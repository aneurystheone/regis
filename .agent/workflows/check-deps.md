---
description: Auditoría de seguridad, control de paquetes desactualizados y actualización segura de dependencias
---

# Workflow: Control y Actualización de Paquetes (`/check-deps`)

Usa este workflow para auditar la seguridad de las dependencias, identificar paquetes obsoletos y actualizar dependencias sin arriesgar la persistencia offline ni los contratos core de **REGIS**.

## Propósito
Garantizar que las dependencias de **REGIS** estén libres de vulnerabilidades críticas y actualizadas, previniendo breaking changes en la capa de datos de la cuenta **Docente** (Firebase SDK, PWA, IndexedDB).

---

## Pasos

### 1. Ejecutar el script determinista de verificación
```powershell
npm run check:deps
```

**Criterio de éxito**: 
- `npm audit` no reporta vulnerabilidades **Críticas** ni **Altas**.
- Se muestra la lista clasificada de paquetes desactualizados (CORE vs SECUNDARIAS).
- La comprobación de tipos TypeScript y la suite de tests (`npm run check`) pasan al 100%.

---

### 2. Evaluar el impacto de dependencias CORE
Si `npm run check:deps` reporta actualizaciones en paquetes **CORE** (`firebase`, `react`, `idb`, `vite-plugin-pwa`, `@capacitor/core`):

1. ⚠️ **NO actualizar automáticamente con `npm update` ni `npm i <pkg>@latest`**.
2. Consultar la documentación y el changelog de la librería buscando:
   - Cambios en firmas de métodos de Firestore / Auth.
   - Cambios en el motor de IndexedDB o caching del Service Worker.
   - Incompatibilidades con Capacitor en entorno móvil.
3. Probar la funcionalidad de sincronización offline con la cuenta **Docente** antes de confirmar la versión en producción.

---

### 3. Procedimiento de actualización segura

#### A. Para dependencias secundarias / DevDependencies:
Si solo requieren parches o updates menores:
```powershell
npm update <nombre-paquete>
```
Ejecutar la suite de validación tras actualizar:
```powershell
npm run check
```

#### B. Para vulnerabilidades de seguridad (`npm audit`):
Si existen parches automáticos de seguridad:
```powershell
npm audit fix
```
> ⚠️ **NUNCA** usar `npm audit fix --force`. Puede instalar breaking major versions inesperadas.

---

### 4. Verificación de compilación final
Tras cualquier cambio en `package.json` o `package-lock.json`:
```powershell
npm run build
```
Confirmar que el bundle compila limpiamente sin errores de empaquetado.

---

> ✅ **Si todos los pasos pasan**: Commit los cambios en `package.json` y `package-lock.json`.  
> 🛑 **Si los tests o la compilación fallan**: Revertir la actualización con `git checkout -- package.json package-lock.json`.
