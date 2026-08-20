# 🎓 Análisis de Requisitos de Lanzamiento — REGIS
## Inicio del Año Escolar 2026–2027

> **Rol**: Product Manager | **Fecha**: 19 de agosto 2026
> **Contexto**: República Dominicana — clases inician la última semana de agosto / primera de septiembre.
> **Versión actual**: v1.8.9 | **Fase Roadmap**: `PHASE_0_BETA_CERRADA`

---

## 1. Contexto Temporal Crítico

El inicio del año escolar es el **único momento del año con máxima receptividad** del Docente para adoptar herramientas nuevas. Los Docentes:

- Están configurando sus cursos, listas de Estudiantes y horarios desde cero
- Tienen motivación alta ("año nuevo, mejor organización")
- Aún no han establecido rutinas con otras herramientas
- Necesitan registrar Asistencia y crear Instrumentos de evaluación en las primeras 2-3 semanas

> [!IMPORTANT]
> **Ventana de oportunidad**: ~3 semanas (última semana de agosto → mediados de septiembre). Si REGIS no captura al Docente en esta ventana, pierde el ciclo completo.

---

## 2. Estado Actual del Producto

### ✅ Lo que funciona y está probado

| Flujo Core | Estado | Evidencia |
|---|---|---|
| **Asistencia** | ✅ Estable | FastAttendance, FAB, offline validado |
| **Calificaciones** | ✅ Estable | Subcollections, idempotent merge, ExpressGrading |
| **Reportes PDF** | ✅ Funcional | Branded (free), jsPDF engine |
| **Onboarding (SetupWizard)** | ✅ Implementado | Horario IA → clases auto-creadas |
| **MissionChecklist** | ✅ Implementado | Gamificado, 5 misiones de valor |
| **Importación de Estudiantes (IA)** | ✅ Funcional | Imagen/Excel/PDF, cuotas free/premium |
| **Offline-first** | ✅ Robusto | IndexedDB, LocalStorage backup, lazy sync |
| **Sincronización** | ✅ Hardened | Idempotent writes, differential attendance |
| **Monetización (Stripe)** | ✅ Integrada | Plan Gratuito / Plan Premium ($7/mes) |
| **Dark Mode** | ✅ Disponible | Preferencia persistente |
| **IA Vicente** | ✅ Funcional | Gemini 3 Flash, criterios, transcripción, lesson plans |
| **Seguridad Firestore** | ✅ Auditada | v1.8.7 hardened, tenant isolation |
| **Cloud Functions** | ✅ Corregidas | v1.8.9, SDK v1 fix, webhooks idempotentes |

### ⚠️ Gaps Identificados para Lanzamiento

| Gap | Severidad | Impacto en Inicio Escolar | Estado |
|---|---|---|---|
| **Fase = `PHASE_0_BETA_CERRADA`** | 🔴 Bloqueante | No hay plan de transición a Fase 1 formalizado | Pendiente |
| **Beta ≤15 Docentes** | 🔴 Bloqueante | Sin validación en contextos diversos (niveles, centros) | En Roadmap Fase 1 |
| **No hay canal formal de feedback** | 🟡 Alto | FeedbackModal existe, pero no hay triage activo visible al Docente | Script existe, pero reactivo |
| **Centro de ayuda / FAQ** | 🟡 Alto | Docente nuevo no tiene referencia de auto-soporte | Inexistente |
| **Landing Page desactualizada** | 🟡 Medio | Primer punto de contacto con Docentes nuevos | Última actualización: v1.6.4 |
| **Referral system sin tracción** | 🟡 Medio | `claimReferralCode` implementado pero sin loop de distribución | Técnicamente listo |
| **Archivado de Período / Término** | 🟡 Medio | Docentes que vienen del año anterior no tienen cómo archivar datos pasados | En Roadmap Fase III |
| **APK Android sin publicar** | 🟡 Medio | Capacitor v8 configurado pero no en Play Store | Build funcional |
| **KPI de retención** | 🟡 Medio | `usage_sessions` existe pero no hay dashboard de retención | Solo admin básico |
| **Tests E2E** | 🟡 Bajo | Unit tests existen (7+ suites), no hay E2E automatizado | Vitest only |

---

## 3. Evaluación de Lanzamiento (Framework de Priorización)

### Escenario: Lanzamiento para Inicio Escolar 2026-2027

| Criterio | Evaluación | Score |
|---|---|---|
| **Impacto en aula** | ✅ Máximo. El inicio escolar es el momento de mayor necesidad (configurar todo desde cero) | **ALTO** |
| **Riesgo de datos** | ✅ Mitigado. Subcollections + idempotent merge + offline backup. Auditado en v1.8.7 | **BAJO** |
| **Complejidad** | ⚠️ REGIS hace mucho (Asistencia, Calificaciones, IA, Reportes, Teams). El Docente nuevo puede sentirse abrumado sin guía | **MEDIO** |
| **Costo de no hacerlo** | 🔴 Perder el ciclo escolar completo. Próxima oportunidad: enero 2027 (segundo semestre) | **CRÍTICO** |
| **Deuda que genera** | ⚠️ Lanzar sin archivado de período crea compromiso futuro. Lanzar sin centro de ayuda genera soporte manual | **MEDIO** |
| **Valor monetizable** | ✅ Plan Gratuito funcional + Plan Premium diferenciado | **MEDIO** |

---

## 4. Recomendación: Lanzamiento Escalonado Controlado

### Decisión: **LANZAR LIMITADO** (Fase 1 del Roadmap)

No hacer un lanzamiento público masivo, pero sí expandir agresivamente la beta aprovechando la ventana escolar.

### Plan de 3 Oleadas

#### 🟢 Oleada 1 — "Semillas" (Semana del 25 agosto)
**Target**: 15 → 50 Docentes
**Estrategia**: Beta testers actuales + invitaciones directas
**Requisitos previos**:

- [ ] **Cambiar fase a `PHASE_1_BETA_AMPLIADA`** en `config/phases.ts`
- [ ] **Actualizar BETA_TESTING_CHECKLIST** a v1.8.9
- [ ] **Verificar SetupWizard completo** con flujo de horario real de inicio escolar
- [ ] **Validar onboarding end-to-end** en dispositivo móvil real (el 90%+ de Docentes usa celular)
- [ ] **Generar enlace de invitación** (QRShareModal funcional)
- [ ] **Mensaje de bienvenida** en WhatsApp con instrucciones mínimas (instalar PWA, subir horario)

#### 🟡 Oleada 2 — "Jardín" (Semana del 8 septiembre)
**Target**: 50 → 100 Docentes
**Condición de entrada**: Oleada 1 tiene ≥40% uso activo semanal
**Estrategia**: Boca a boca + referidos (activar `claimReferralCode`)
**Requisitos previos**:

- [ ] **Canal de feedback activo** (WhatsApp group o formulario rápido visible en app)
- [ ] **Landing Page actualizada** con capturas v1.8.x reales
- [ ] **FAQ mínimo** (5-10 preguntas frecuentes: instalación, offline, subir lista)
- [ ] **Monitoreo diario** de `usage_sessions` y `system_logs`

#### 🔴 Oleada 3 — "Cosecha" (Octubre)
**Target**: 100 → 200+ Docentes
**Condición de entrada**: Retención 30 días ≥30%, cero bugs críticos en datos
**Estrategia**: Distribución semi-pública (WhatsApp de grupos docentes, demostraciones)
**Requisitos previos**:

- [ ] **Archivado de período** (al menos visual, no destructivo)
- [ ] **Centro de ayuda ligero** integrado en app
- [ ] **Propuesta de valor clara** documentada: "REGIS ahorra X horas al mes"

---

## 5. Backlog Priorizado para Inicio Escolar

### 🔴 P0 — Hacer ANTES del 25 de agosto (Bloqueantes)

| # | Item | Justificación |
|---|---|---|
| 1 | **Validar SetupWizard + MissionChecklist en móvil** | El 90% de Docentes usa celular. Si falla aquí, se pierden |
| 2 | **Test manual completo offline** (asistencia + calificación + sync) | El aula tiene conectividad intermitente. Esto es vida o muerte |
| 3 | **Actualizar `CURRENT_PHASE` a Fase 1** | Refleja la realidad del producto. Señal interna de progreso |

### 🟡 P1 — Hacer en la primera semana de clases

| # | Item | Justificación |
|---|---|---|
| 4 | **`navigator.storage.persist()`** | 1 línea de código que protege IndexedDB contra evicción por el navegador. Crítico para datos offline |
| 5 | **Landing Page refresh** | Primer punto de contacto. Capturas actualizadas = confianza |
| 6 | **FAQ mínimo / Centro de ayuda** | Reduce soporte manual. El Docente busca auto-resolver |
| 7 | **Activar referidos** | Loop de crecimiento orgánico durante el período de mayor receptividad |
| 8 | **Dashboard Admin: métricas de retención** | Sin datos, navegamos a ciegas. Necesitamos ver retención día 1, 7, 30 |
| 9 | **Test en Safari/iOS real** | Validar que flujos core funcionan en iPhone. Evitar sorpresas con Docentes Apple |

### 🟢 P2 — Hacer en septiembre

| # | Item | Justificación |
|---|---|---|
| 8 | **Archivado de período** (visual/lectura) | Docentes que vienen del año anterior preguntan por sus datos |
| 9 | **Notificaciones de actualización mejoradas** | UpdatePrompt existe pero necesita ser más visible |
| 10 | **Refinamiento de Reportes** | Primer período termina en ~octubre. Reportes deben ser impecables |

### ⚪ P3 — Postergar (No para este ciclo)

| Item | Razón para postergar |
|---|---|
| App nativa en Play Store | PWA es suficiente. APK genera fricción de actualización |
| APK / EXE para evangelizadores | Riesgo de fragmentación de versiones. PWA con QR es superior |
| Integración WhatsApp (Fase 3) | Demasiado prematuro. Foco en core |
| App para Estudiantes (Fase 4) | Fuera de alcance actual |
| Tests E2E automatizados | Útil pero no bloquea lanzamiento |

---

## 6. Riesgo Plataforma: Docentes Apple (iOS / Safari)

Un porcentaje de Docentes usará iPhone o iPad. Las PWA en iOS tienen limitaciones reales que impactan la experiencia.

### Estado actual de REGIS en iOS

| Capacidad | Android (Chrome) | iOS (Safari) | Impacto para REGIS |
|---|---|---|---|
| **Instalación PWA** | ✅ Prompt automático (`beforeinstallprompt`) | ⚠️ Manual ("Agregar a pantalla inicio") | Docente iOS necesita instrucciones explícitas |
| **IndexedDB persistencia** | ✅ Persistente | ⚠️ **Riesgo de evicción tras ~7 días de inactividad** en Safari sin instalar. Como PWA instalada: más estable | Docente que no usa REGIS en vacaciones/fin de semana largo podría perder caché local |
| **`navigator.storage.persist()`** | ✅ Soportado | ❌ **No soportado en Safari** | No hay forma de solicitar persistencia en iOS |
| **Push Notifications** | ✅ Soportado | ✅ Soportado (iOS 16.4+, solo PWA instalada) | Funcional si el Docente instala |
| **Background Sync** | ✅ Soportado | ❌ **No soportado** | Writes offline se sincronizan al reabrir, no en background |
| **Audio Recording** | ✅ Estable | ⚠️ Funcional pero con quirks en WebView | Anécdotas con audio podrían fallar |
| **Cámara / Galería** | ✅ Estable | ⚠️ Requiere `<input capture>` correcto | Extracción de listas por foto podría fallar |
| **Service Worker** | ✅ Estable | ⚠️ Safari tiene bugs históricos con SW lifecycle | Actualizaciones pueden requerir cerrar/reabrir |
| **Login con Apple** | N/A | ✅ Implementado (`authService.loginWithApple`) | Listo |

### Mitigación por diseño (ya existente)

✅ **Firestore cloud es el respaldo real** — si el caché local de iOS se evicta, al reabrir REGIS con conexión se restaura todo desde la nube. Cero pérdida de datos.

✅ **`usePWAInstall.ts` ya detecta iOS** — expone `isIOS` para mostrar instrucciones manuales de instalación.

✅ **Login con Apple** ya está implementado en `authService.ts`.

### Acciones recomendadas para iOS

| Acción | Prioridad | Justificación |
|---|---|---|
| **Instrucciones visuales de instalación iOS** en Landing Page y onboarding | P1 | Sin prompt automático, el Docente iOS necesita guía visual |
| **Test manual en iPhone real** (Safari + PWA instalada) | P1 | Verificar flujos core: login, asistencia, calificación, offline |
| **Advertencia al detectar Safari no-instalado** | P2 | "Instala REGIS para mejor experiencia" con pasos |
| **Validar audio recording en iOS Safari** | P2 | Anécdotas con grabación podrían fallar |

### Veredicto de producto

> El Docente iOS **puede usar REGIS hoy** sin bloqueos funcionales. El riesgo principal es UX de instalación (no hay prompt automático) y evicción de caché en safari sin instalar. Ambos se mitigan con:
> 1. Instrucciones claras de instalación
> 2. El hecho de que Firestore cloud es el respaldo definitivo
>
> **No es bloqueante para lanzamiento**, pero necesita test real en iPhone antes de Oleada 1.

---

## 7. Riesgos de Producto

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Docente se abruma con features** | Alta | Deserción en día 1 | MissionChecklist ya guía. Considerar ocultar features avanzadas hasta completar misiones |
| **Offline falla en dispositivo específico** | Media | Pérdida de confianza total | Test en 3+ dispositivos reales antes de Oleada 1 |
| **Docente no entiende qué es "instalar PWA"** | Alta | No llega a usar REGIS | Instrucciones visuales paso a paso (video de 30 seg) |
| **Docente iOS pierde caché local** | Media | Confusión (datos aparecen vacíos temporalmente) | Firestore cloud restaura al reconectar. Agregar mensaje "Sincronizando..." |
| **Stripe checkout falla en móvil** | Baja | Pérdida de conversión Premium | Test manual pre-lanzamiento |
| **Costos Firestore escalan sin control** | Baja (a 50-100 usuarios) | Costo operativo inesperado | Monitor activado, $42/mes estimado a 500 users |
| **Feedback negativo sin canal de respuesta** | Media | Docente frustrado se va silenciosamente | WhatsApp group + FeedbackModal con triage activo |

---

## 7. Criterios de Éxito (KPIs para Oleada 1)

| Métrica | Target | Cómo medir |
|---|---|---|
| **Docentes registrados** | ≥30 en semana 1 | `teacher_profile` count |
| **Completó onboarding** | ≥70% de registrados | `MissionChecklist` ≥3 misiones |
| **Uso en día 2** | ≥50% volvió | `usage_sessions` día 2 |
| **Uso autónomo** | ≥30% sin `assisted` | `usage_sessions.assisted = false` |
| **Flujos core usados** | ≥1 Asistencia + ≥1 Calificación | `flowsUsed` en telemetría |
| **Bugs críticos** | 0 pérdida de datos | `system_logs` severity = critical |
| **NPS informal** | ≥7/10 en WhatsApp | Pregunta directa a beta testers |

---

## 8. Resumen Ejecutivo

> [!CAUTION]
> **La ventana de inicio escolar dura ~3 semanas.** Si REGIS no captura Docentes ahora, el próximo momento natural es enero 2027.

### Lo que REGIS tiene a favor:
- ✅ Producto técnicamente maduro (v1.8.9, 9 meses de desarrollo)
- ✅ Flujos core estables y auditados
- ✅ Onboarding diferenciado (IA extrae horario automáticamente)
- ✅ Offline-first real (no simulado)
- ✅ Monetización lista

### Lo que falta para lanzar con confianza:
- 🔴 Validación en móvil real con Docentes nuevos
- 🟡 Canal de soporte visible
- 🟡 Landing Page y material de distribución actualizado
- 🟡 Métricas de retención observables

### Decisión de producto:
**Lanzar en Oleada 1 (beta ampliada a 50 Docentes) el 25 de agosto**, con los P0 completados. No postergar por perfección — el costo de no estar presente en el inicio escolar es mayor que el riesgo de lanzar con gaps P2.

> *"Un producto confiable hoy > un producto perfecto en octubre."*
