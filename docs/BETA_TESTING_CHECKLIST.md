# Lista de Verificación para Beta Testers (Regis v1.8.0)

Bienvenido al programa de pruebas beta de Regis. Tu feedback es crucial para asegurar que la aplicación sea estable y útil para todos los maestros. Por favor, utiliza esta lista para guiar tus pruebas.

## 📋 Preparación
- [ ] Asegúrate de estar probando en la versión **v1.8.0** (visible en la configuración o footer si aplica).
- [ ] Prueba en dispositivos móviles y de escritorio si es posible.
- [ ] **Nota:** Si encuentras un error, toma una captura de pantalla y anota los pasos para reproducirlo.

## 🔐 Autenticación y Cuenta
- [ ] **Iniciar Sesión:** Entra con tu correo y contraseña.
- [ ] **Persistencia:** Cierra la pestaña y vuelve a abrirla. ¿Sigues logueado?
- [ ] **Cerrar Sesión:** Usa el botón de salir y verifica que te redirige al login.
- [ ] **Recuperar Contraseña:** (Si aplica) Prueba el flujo de "Olvidé mi contraseña".

## 📚 Gestión de Clases y Estudiantes
- [ ] **Ver Clases:** ¿Aparecen todas tus clases asignadas correctamente?
- [ ] **Lista de Estudiantes:** Entra a una clase y verifica que todos los estudiantes estén listados.
- [ ] **Perfil de Estudiante:** Haz clic en un estudiante para ver sus detalles.

## ✅ Asistencia (Attendance)
- [ ] **Marcar Asistencia:** Marca presentes, ausentes y tardanzas para un día específico.
- [ ] **Botón Flotante (FAB):** Usa el botón flotante para marcar a todos como "Presentes" de una vez.
    - [ ] Verifica que no haya pantalla blanca o error al usar esta función.
- [ ] **Cambiar Fechas:** Navega a días anteriores y futuros.

## 📝 Calificaciones (Gradebook)
- [ ] **Vista de Tabla:** Verifica que las columnas de notas se vean bien.
- [ ] **Ingresar Notas:** Pon una nota a un estudiante. ¿Se guarda automáticamente?
- [ ] **Vista Móvil:**
    - [ ] Verifica que los nombres de los estudiantes sean legibles (tamaño de letra adecuado).
    - [ ] Solo debe mostrarse el primer nombre en pantallas pequeñas.
    - [ ] Manten presionado el nombre para ver el nombre completo (Tooltip).
- [ ] **Notas Inválidas:** Intenta poner una nota fuera de rango (ej. 105 o -5). ¿El sistema te detiene?

## 📎 Anécdotas y Evidencias
- [ ] **Crear Anécdota:** Agrega una observación a un estudiante.
- [ ] **Adjuntar Archivo:** Sube una foto o documento como evidencia.
- [ ] **Ver Guardado:** Confirma que la anécdota aparece en el perfil del estudiante.

## 📡 Modo Offline (Sin Conexión)
*Esta es una parte crítica de la prueba.*
1.  **Desconecta Internet:** Pon tu dispositivo en "Modo Avión" o desconecta el WiFi.
2.  **Realiza Acciones:**
    - [ ] Toma asistencia.
    - [ ] Agrega una nota.
    - [ ] Crea una anécdota (sin adjuntos pesados por ahora).
3.  **Indicador Offline:** ¿La app te muestra que estás sin conexión?
4.  **Reconectar:** Vuelve a conectar internet.
5.  **Sincronización:**
    - [ ] Verifica que los cambios hechos offline se hayan guardado en la nube (recarga la página después de unos segundos).

## 🚀 Actualizaciones
- [ ] **Notificación de Update:** Si hay una nueva versión disponible, ¿te aparece el aviso para actualizar?

---
### 🐞 Reporte de Errores
Si encuentras un bug, por favor repórtalo con el siguiente formato:
1.  **Qué estabas haciendo:** (ej. Intentando subir una foto en modo offline)
2.  **Qué pasó:** (ej. La app se quedó cargando infinitamente)
3.  **Qué esperabas:** (ej. Que dijera "Guardado pendiente de conexión")
