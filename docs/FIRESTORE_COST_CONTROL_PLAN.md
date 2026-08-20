# Plan de Control de Costos y Estabilidad (Firebase Blaze)

Este documento define la estrategia técnica y operativa para garantizar que Regis sea sostenible y predecible en el plan Blaze de Firebase, soportando el crecimiento hasta 1,000+ usuarios sin riesgos financieros.

## 1. Reglas Estrictas (Firestore + Auth)

El objetivo es cerrar cualquier "grifo abierto" que permita lecturas/escrituras masivas, ya sea por malicia o errores de código.

### A. Principios de Diseño
1.  **Deny by Default**: Todo lo que no está explícitamente permitido, está prohibido.
2.  **User Isolation**: Un usuario JAMÁS puede leer/escribir datos de otro (excepto Admins y casos muy específicos).
3.  **Schema Validation**: Las reglas deben validar tipos de datos básicos para evitar "basura" que infle el almacenamiento.

### B. Acciones Concretas (en `firestore.rules`)
*   **[PROHIBIDO] Listados Abiertos**: Nunca `allow list` en colecciones raíz sin filtros `where('userId', '==', auth.uid)`.
    *   *Riesgo*: Un bug en el cliente podría descargar 10,000 documentos en una consulta sin indexar.
*   **[LIMITADO] Creación de Feedback/Logs**:
    *   Implementar *Rate Limiting* (si es posible vía Cloud functions o reglas temporales con timestamps) o simplemente monitorear alertas.
    *   Validar que el tamaño del mensaje de feedback no exceda 2KB.
*   **[PERMITIDO] Reads/Writes Propietarios**:
    *   Mantener `request.auth.uid == resource.data.userId`.
*   **[NUEVO] Inmutabilidad de Logs**:
    *   `system_logs` debe ser `allow create`, pero `deny update/delete` para usuarios normales.

## 2. Límites Claros (Técnicos y de Producto)

Definir "Guardarraíles" para evitar abusos o uso no intencionado que dispare costos.

### A. Límites de Producto (Comunicables)
*   **Almacenamiento de Evidencias**:
    *   Máximo **500MB** por docente (Plan Básico/Beta).
    *   *Implementación*: Reglas de Storage `request.resource.size < 5 * 1024 * 1024` (5MB por archivo).
*   **Historial de Chats AI**:
    *   Retención máxima de **30 días** o **50 mensajes** por conversación.
    *   *Acción*: Cloud Function programada (o script de mantenimiento) para borrar historial antiguo (TTL).

### B. Límites Técnicos (Invisibles)
*   **Tamaño de Documentos**:
    *   Validar en reglas que campos de texto libre (ej. `anecdote.text`) no superen 10KB.
*   **Frecuencia de Sincronización Telemetría**:
    *   El cliente (`usageService.ts`) ahora tiene un "debounce" de **10 segundos** con cola local antes de despachar en batch flujos y acciones para proteger `usage_sessions` contra *Write Exhaustion*.
*   **Batch Writes**:
    *   Máximo 500 operaciones por batch (límite duro de Firestore), pero limitaremos internamente a **50** por transacción de UI para evitar reintentos masivos costosos.

## 3. IA Desacoplada (Arquitectura "Cost-Aware")

La IA es el mayor riesgo de volatilidad. Debe estar aislada.

### A. Arquitectura Conceptual
*   **Fuera de Firebase**: La lógica de IA (prompts, cadenas, contexto) vive en **Edge Functions** (Vercel/Cloudflare) o un servidor ligero, NO en el cliente directo.
*   **Pasarela de API**: El cliente llama a `api.regis.app/ask-ai`, NO a OpenAI/Gemini directamente.
*   **Control de Presupuesto**:
    *   La pasarela tiene un **Hard Cap** mensual de $X USD.
    *   Si se acaba el saldo, la IA responde: *"Servicio en mantenimiento/recarga"*, pero el resto de la app sigue funcionando.

### B. Estrategias Anti-Loop
*   **No Auto-GPT**: La IA nunca se llama a sí misma.
*   **User Action Required**: Cada interacción con la IA requiere un clic explícito del usuario (ej. "Generar Reporte"). Nada de "generación en segundo plano" masiva.
*   **Caching Agresivo**:
    *   Si un usuario pide "Resumen de asistencia" dos veces hoy, la segunda vez se sirve de caché (Firestore) sin llamar a la API de IA.

## 4. Métricas Duras y Monitoreo

Lo que no se mide, no se controla. Usaremos **Google Cloud Monitoring** + Dashboard personalizado.

### A. Set Mínimo de Métricas
1.  **Reads/Writes por Usuario Activo**:
    *   *Alerta*: Si `Writes > 500/hora` por usuario -> Investigar.
2.  **Cloud Function Invocations**:
    *   *Alerta*: Picos repentinos (> 200% del promedio de la semana anterior).
3.  **Storage Bandwidth**:
    *   Monitorear descargas de imágenes/audio.

### B. Dashboard Operativo (Mentalidad "Cockpit")
*   Un panel simple en Google Cloud Console que muestre:
    *   Costo acumulado del mes (vs Presupuesto).
    *   Proyección a fin de mes.
    *   Usuarios activos hoy.

## 5. Playbook de Emergencia

¿Qué hacer cuando suena la alarma?

### A. Señales de Alarma (Defcon Levels)
*   **Nivel Amarilla**: Costo proyectado +20% sobre presupuesto. -> *Acción*: Revisar logs, identificar usuario/feature "glotona".
*   **Nivel Naranja**: Costo proyectado +50%. -> *Acción*: Desactivar features "caras" (IA, subida de archivos) vía `Remote Config`.
*   **Nivel Roja**: Explosión de tráfico/ataque. -> *Acción*: **Kill Switch**.

### B. Kill Switch (Botón del Pánico)
1.  **Modo Solo Lectura**: Cambiar `firestore.rules` para rechazar todas las `write` excepto admins. La app sigue visible pero no guarda.
2.  **Apagado Total**: Cambiar reglas para rechazar todo `read/write`.

### C. Acciones Inmediatas (Sin Deploy)
*   Usar **Firebase Remote Config** para:
    *   `ai_enabled: false`
    *   `sync_interval_ms: 300000` (aumentar tiempo de sync)
    *   `max_file_size_mb: 0` (deshabilitar subidas)

---

## Próximos Pasos Técnicos para el Developer
1.  [x] Actualizar `firestore.rules` con validaciones de tamaño y límites básicos (Completado en `usage_sessions`).
2.  [ ] Configurar **Budget Alerts** en Google Cloud Billing (al 50%, 90%, 100% del presupuesto).
3.  [ ] Implementar **Remote Config** en el cliente (`useRemoteConfig`) para poder apagar features remotamente.
4.  [ ] Refactorizar `geminiService.ts` para preparar el desacople (mover keys y lógica fuera del cliente eventualmente).
