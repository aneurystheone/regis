---
description: Desplegar una nueva versión al entorno Beta para pruebas
---

# Workflow: Deploy Beta

Usa este workflow para enviar una nueva versión al entorno beta (`beta-regis.web.app`) donde hacen pruebas los beta testers.

## Pre-condiciones
- El ciclo de desarrollo del feature/fix está completo
- Tienes la nueva versión en mente (ej. `1.9.0`)

## Pasos

### 1. Ejecutar Pre-Deploy Check
Invocar workflow `/pre-deploy-check` y confirmar que todos los pasos pasan.
**No continuar si algún paso falla.**

### 2. Actualizar la versión
```powershell
npx tsx scripts/update-version.ts <X.Y.Z>
```
Esto sincroniza automáticamente `package.json` y `APP_VERSION` en `types.ts`.

### 3. Actualizar CHANGELOG.md
Añadir entrada para la nueva versión con los cambios del ciclo:
```markdown
## [X.Y.Z] - YYYY-MM-DD
### Added
- ...
### Changed
- ...
### Fixed
- ...
```

### 4. Build de producción
// turbo
```powershell
npm run build:prod
```
> ⚠️ **Importante**: Usar siempre `build:prod` (no `build`) para que Vite tome `.env.production` con las variables del proyecto Firebase de producción. Usar `build` (modo development) causará "Site not found" o conectar al proyecto Firebase equivocado.

### 5. Deploy al entorno Dev (Firebase dev project)
```powershell
npm run deploy:dev
```
Esto despliega hosting + reglas al proyecto Firebase de desarrollo (`regis-dev-150626.web.app`).

### 6. Smoke test manual en Dev
Abrir `https://regis-dev-150626.web.app` y verificar los 3 flujos core:
- [ ] **Autenticación**: Login funciona (usar cuenta registrada en proyecto dev)
- [ ] **Asistencia**: Se puede marcar y guardar
- [ ] **Calificación**: Se puede ingresar una nota

> ⚠️ El smoke test es en **dev**, no en beta. Beta aún no tiene esta versión.
Si alguno falla, **no continuar**.

### 7. Deploy al hosting beta
```powershell
npm run deploy:web:beta
```

### 8. Notificar a beta testers
Comunicar la nueva versión y los cambios relevantes para las pruebas.
Adjuntar o referenciar `BETA_TESTING_CHECKLIST.md` si es una versión major.

---
> 📌 **Beta** comparte la base de datos de producción. No uses datos reales de prueba que puedan contaminar métricas.
