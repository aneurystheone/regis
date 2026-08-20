---
description: Actualizar documentación tras un cambio significativo
---

# Workflow: Actualizar Documentación

Usa este workflow después de completar una feature importante, un fix crítico, o un cambio arquitectónico.
También invócalo antes de exportar contexto a NotebookLM.

## Pasos

### 1. Invocar skill Documenter
Activar el rol de documentador técnico para revisar qué necesita actualizarse.

### 2. Actualizar ARCHITECTURE.md (si aplica)
Revisar si el cambio afecta:
- La estructura de directorios del proyecto
- Las reglas de arquitectura (Manager Pattern, etc.)
- La capa de servicios
- El modelo de datos en Firestore
- La tabla del Technical Roadmap (fases)

Archivo: `docs/ARCHITECTURE.md`

### 3. Actualizar CHANGELOG.md
Confirmar que existe una entrada para la versión actual con todos los cambios:
```markdown
## [X.Y.Z] - YYYY-MM-DD
### Added / Changed / Fixed
- **[Componente]**: Descripción concisa del cambio.
```
Archivo: `docs/CHANGELOG.md`

### 4. Actualizar GLOSSARY.md (solo si es necesario)
Si el cambio introduce un concepto nuevo que aparecerá en el código o la UI:
- Agregarlo al glosario con definición formal
- Verificar que no contradice términos existentes
- **Regla**: Si el término no tiene impacto técnico o pedagógico real, no añadirlo

Archivo: `.agent/GLOSSARY.md`

### 5. Regenerar contexto para NotebookLM
// turbo
```powershell
npm run gen:context
```
Esto actualiza el archivo de contexto en `docs/generated/` con el estado actual del proyecto.
Útil para análisis arquitectónico periódico con NotebookLM.

### 6. Verificar ROADMAP_REGIS
Si el cambio completa un hito de una fase:
- Marcar el ítem como completado en `docs/ROADMAP_REGIS`
- Evaluar si estamos listos para avanzar de fase según los KPI clave

---
> 📌 **Frecuencia recomendada**: Al menos una vez por versión. No esperar a acumular muchos cambios sin documentar.
