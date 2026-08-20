# Glosario Canónico REGIS (v1)

Este glosario es **normativo**, no descriptivo. Define los términos oficiales que deben usarse de forma consistente en:

* Prompts de Antigravity
* Código
* UX / Copy
* Métricas
* Documentación técnica

Si un término no aparece aquí, **no debe introducirse** sin una decisión explícita.

---

## 1. Entidades humanas

### Docente

Usuario principal del sistema REGIS. Registra asistencia, calificaciones y genera reportes.

* No es “usuario”
* No es “teacher” en prompts
* Se usa siempre **Docente**

---

### Administrador / Admin

Owner del sistema. Supervisa uso, métricas y acompaña a los docentes.

* No registra calificaciones
* No edita datos pedagógicos
* Puede marcar sesiones como `assisted`

---

### Estudiante

Entidad pedagógica pasiva.

* No inicia sesión
* No edita información
* Sus datos son gestionados exclusivamente por el Docente

---

## 2. Entidades del producto

### REGIS

Producto completo.

* No es “la app”
* Se nombra siempre como **REGIS**

---

### Cuenta Docente

Vista y permisos correspondientes al Docente.

* UI optimizada para contexto de aula
* Acceso a flujos core

---

### Cuenta Admin

Vista y permisos correspondientes al Administrador.

* Visualización de métricas
* Acompañamiento
* Sin uso pedagógico

---

## 3. Conceptos pedagógicos (núcleo)

### Asistencia

Registro de presencia por clase.

* Acción rápida
* Flujo core
* No editable retroactivamente sin intención explícita

---

### Calificación

Valor asignado a un estudiante mediante un instrumento.

* Dato crítico
* Nunca se sobrescribe
* Se deriva de eventos

---

### Instrumento de evaluación

Unidad pedagógica que genera calificaciones.

* Tiene peso
* No es solo un campo numérico

---

### Competencia

Agrupador curricular de instrumentos.

* Define estructura
* No editable libremente

---

## 4. Conceptos técnicos críticos

### Evento

Registro inmutable de una acción pedagógica.

* Append-only
* Offline-safe
* Nunca se edita

Ejemplos: `grade_event`, `attendance_event`

---

### Estado derivado

Resultado calculado a partir de eventos.

* Ej.: promedios, reportes
* No es fuente de verdad
* Puede recalcularse

---

### Sincronización

Proceso de envío de eventos offline a Firestore.

* Automática
* No bloqueante
* No destructiva

---

### Pérdida de datos

Cualquier acción que:

* Elimina un evento
* Sobrescribe un dato no sincronizado
* Oculta información registrada

Se considera **error crítico**.

---

## 5. Offline y multi-dispositivo

### Offline-first

REGIS funciona completamente sin conexión.

* Escritura permitida
* Lectura cacheada
* Sin bloqueos artificiales

---

### Dispositivo

Instancia física desde la cual se usa REGIS.

* Identificado por `deviceId`
* Puede haber múltiples por Docente

---

### Conflicto

Dos eventos válidos generados en distintos dispositivos.

* Ambos se conservan
* No se resuelve por overwrite

---

### Pending writes

Eventos locales aún no sincronizados.

* Visibles al usuario
* Nunca ignorados

---

## 6. Métricas y adopción

### Flujo core

Acción que demuestra uso real en aula.

* Asistencia
* Calificación
* Reporte

---

### Sesión de uso

Uso diario real del sistema por un Docente.

* Registrada en `usage_sessions`
* Máximo una por día

---

### Uso autónomo

Uso del sistema sin acompañamiento.

* `assisted = false`
* No inferido

---

### Retención

Uso recurrente en días distintos.

* Métrica clave de fase
* No equivale solo a login

---

## 7. IA (estado actual)

### Funciones IA

Capacidades inteligentes no visibles al Docente.

* Técnicamente listas
* No activas
* No prometidas

---

### Asistente

Agente interno que apoya decisiones.

* No reemplaza al Docente
* Sugiere, no impone

---

## 8. Principios de lenguaje (obligatorios)

* Usar siempre los mismos términos
* No traducir conceptos clave
* No usar sinónimos ambiguos
* Priorizar claridad sobre marketing

---

## 9. Monetización

### Plan

Nivel de acceso de un Docente al sistema REGIS.

* Dos valores posibles: **Plan Gratuito** o **Plan Premium**
* No se llama "tier", "nivel" ni "cuenta"
* Se usa siempre **Plan**

---

### Plan Gratuito

Acceso sin pago. Incluye funcionalidad pedagógica core.

* Límite: 10 clases
* IA Vicente: 10 extracciones de lista/mes
* Sin IA Vicente para reportes, audio ni planificación
* No es "cuenta básica" ni "free tier"

---

### Plan Premium

Acceso completo mediante suscripción mensual.

* Precio: $7/mes (vía Stripe)
* Clases ilimitadas
* IA Vicente sin límite
* Se usa siempre **Plan Premium**, nunca "pro", "plus" ni "paid"

---

### Suscripción

Estado técnico del Plan de un Docente en Firestore.

* Colección: `subscriptions/{uid}`
* Estados: `active` | `trial` | `expired` | `cancelled`
* Fuente: `manual` | `stripe` | `appstore` | `playstore`
* No es sinónimo de Plan; es el objeto que lo implementa

---

### Docente Grandfathered

Docente que tenía clases creadas antes de que se activara el límite del Plan Gratuito.

* Campo: `grandfathered: true` en `subscriptions/{uid}`
* Exención: sin límite de clases aunque esté en Plan Gratuito
* Política: exención permanente (sin fecha de expiración)
* No debe mostrarse en UI al Docente; es una protección silenciosa

---

### Extracción de lista

Acción de IA que genera una lista de Estudiantes automáticamente.

* Feature técnica: `studentExtraction`
* Límite free: 10 por mes (se resetea el 1ro de cada mes)
* Premium: ilimitado
* Se cuenta en `subscriptions/{uid}.usage.studentExtractions`

---

## Regla canónica final

**Si un término no está en este glosario, no existe en REGIS.**

Las extensiones al glosario deben:

* Resolver ambigüedad real
* Tener impacto técnico o pedagógico
* Documentarse explícitamente
