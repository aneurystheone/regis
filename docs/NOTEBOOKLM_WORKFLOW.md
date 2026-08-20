# Integración de NotebookLM al Workflow de Desarrollo (Regis)

Este documento define la estrategia para utilizar **NotebookLM** como un "Arquitecto Senior AI" o "Product Manager Técnico" dentro del ciclo de vida de desarrollo de Regis.

NotebookLM se convierte en la **memoria viva** del proyecto, respondiendo preguntas basadas estrictamente en nuestra documentación técnica y código fuente.

## 1. Definición del Corpus (La "Fuente de la Verdad")

Para que NotebookLM sea efectivo, debe nutrirse de los documentos correctos. El "Corpus Regis" se compone de 3 categorías:

### A. Documentación Core (Estratégico)
Estos archivos definen **qué** estamos construyendo y **por qué**.
*   `docs/ARCHITECTURE.md`: Reglas inquebrantables del sistema (Offline-first, Manager Pattern).
*   `docs/ROADMAP_REGIS`: Hacia dónde vamos (MVP vs Futuro).
*   `docs/OFFLINE_STRATEGY.md`: La lógica más compleja del sistema.
*   `types.ts`: El contrato de datos fundamental.

### B. Contexto de Implementación (Táctico)
Estos archivos explican **cómo** funciona el sistema actualmente.
*   `services/api.ts`: El motor de sincronización.
*   `services/authService.ts`: Manejo de identidad.
*   `docs/INCIDENT_DATA_LOSS.md`: Lecciones aprendidas (para evitar regresiones).

### C. Especificaciones de Funcionalidad (Feature Specs)
Antes de codificar, subimos el "mini-spec" de la tarea actual.
*   `docs/[FEATURE_NAME_PLAN].md` (Si existe).

---

## 2. Flujos de Trabajo (Use Cases)

### Caso 1: Validación de Arquitectura (Pre-Code)
Antes de escribir una nueva feature (ej. "Sistema de Badges"), consulta al Notebook.

**Prompt Sugerido:**
> "Actúa como el Lead Architect de Regis. Basado en `ARCHITECTURE.md` y `types.ts`, evalúa mi propuesta para el sistema de Badges (ver abajo). ¿Viola algún principio de 'Offline First' o 'No Direct DB Access'? ¿Cómo debería estructurar los datos en Firestore?"

### Caso 2: Onboarding & Explicación de Código
Cuando te enfrentes a un bug complejo en `offline-sync.test.ts`.

**Prompt Sugerido:**
> "Explícame cómo funciona la lógica de resolución de conflictos en `api.ts` según la documentación de `OFFLINE_STRATEGY.md`. ¿Por qué podría estar fallando el test de 'retry logic'?"

### Caso 3: Generación de Datos (Curriculum JSON)
Cuando necesites agregar una nueva asignatura o grado (ej. "3ro de Secundaria - Ciencias Sociales").

**Prompt Sugerido:**
> "Basado en la estructura de `curriculums.json` y el ejemplo de `competencies_matematica.json`, genera los archivos JSON necesarios para 'Ciencias Sociales 3ro Secundaria'.
>
> **Input:**
> - Asignatura: Ciencias Sociales
> - Grado: 3ro Secundaria
> - Competencias Fundamentales: Ética y Ciudadana (FC1), Comunicativa (FC2)...
> - Contenidos: [Lista de temas...]
>
> Genera el JSON para `curriculums.json` (entrada nueva) y el archivo `competencies_sociales_3ro.json` completo con indicadores sugeridos."

### Caso 4: Generación de Documentación y Changelogs
Al terminar un sprint o una feature grande.

**Prompt Sugerido:**
> "Basado en los cambios recientes en `api.ts` y el nuevo `MobileGradeGrid.tsx`, redacta un párrafo para el `CHANGELOG.md` que explique las mejoras de performance a un usuario no técnico."

---

## 3. Automatización: El script `generate-context`

Para evitar subir 20 archivos manualmente, crearemos un script que concatena los archivos más importantes en uno solo (`Regis_Context_Snapshot.txt`) para subirlo fácilmente a NotebookLM.

**Comando:**
```bash
npm run gen:context
```

**Salida:**
Un archivo en `docs/generated/Regis_Context_[FECHA].txt` que contiene:
1.  Todo `docs/` (seleccionados).
2.  `types.ts`.
3.  `services/api.ts`.
4.  `package.json`.

---

## 4. Rutina de Mantenimiento

1.  **Cada Sprint Start**: Correr `npm run gen:context` y actualizar la fuente en NotebookLM ("Add Source" -> Update).
2.  **Cada Cambio de Arquitectura**: Si se modifica `ARCHITECTURE.md`, es **obligatorio** actualizar el Notebook.
