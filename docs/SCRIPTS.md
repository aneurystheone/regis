# Scripts del Proyecto

A continuación se detallan los comandos definidos en `package.json` para las tareas de desarrollo, compilación, pruebas y despliegue.

| Script | Comando | Descripción |
| :--- | :--- | :--- |
| **`dev`** | `vite` | Inicia el servidor de desarrollo local (HMR). |
| **`build`** | `vite build` | Compila la aplicación y genera los archivos estáticos en `dist` para producción. |
| **`build:prod`** | `vite build --mode production` | Compila la aplicación con las variables del entorno de producción. |
| **`build:standby`** | `vite build --mode standby` | Compila la aplicación apuntando al entorno de contingencia / réplica (`.env.standby`). |
| **`preview`** | `vite preview` | Previsualiza localmente la versión compilada (sirve los archivos de `dist`). |
| **`check`** | `vitest run && tsc --noEmit` | Verificación rápida pre-deploy: corre todos los tests una sola vez y valida tipos TypeScript sin generar archivos. Úsalo antes de cualquier deploy en lugar de `test` + `build`. |
| **`check:deps`** | `node scripts/check-deps.js` | Auditoría de vulnerabilidades (npm audit), verificación de paquetes desactualizados (alertando dependencias CORE) y ejecución de suite de tests. |
| **`test`** | `vitest` | Ejecuta la batería de pruebas unitarias y de integración (modo watch). |
| **`test:ui`** | `vitest --ui` | Abre la interfaz gráfica interactiva de Vitest para explorar y ejecutar pruebas. |
| **`deploy:dev`** | `firebase deploy --project dev --config firebase.dev.json` | Despliega toda la configuración (hosting, reglas, etc.) al entorno de desarrollo. |
| **`deploy:functions:dev`** | `npm run --prefix functions build && firebase deploy --only functions --project dev --config firebase.dev.json` | Compila y despliega las Cloud Functions (Stripe Webhook, Checkout) a desarrollo. |
| **`deploy:rules:dev`** | `firebase deploy --only firestore:rules --project dev --config firebase.dev.json` | Despliega únicamente las reglas de seguridad de Firestore al entorno de desarrollo. |
| **`deploy:rules:prod`** | `firebase deploy --only firestore:rules --project prod` | Despliega únicamente las reglas de seguridad de Firestore al entorno de producción. |
| **`deploy:web:beta`** | `firebase deploy --only hosting:beta --project prod` | Despliega el frontend al target de hosting `beta` dentro del proyecto de producción. |
| **`deploy:web:prod`** | `firebase deploy --only hosting:pro --project prod` | Despliega el frontend al target de hosting `pro` (Producción final). |
| **`deploy:standby`** | `firebase deploy --project standby --config firebase.dev.json` | Despliega hosting y reglas al proyecto de contingencia / réplica (Standby). |
| **`deploy:rules:standby`** | `firebase deploy --only firestore:rules --project standby --config firebase.dev.json` | Despliega únicamente las reglas de seguridad de Firestore al proyecto Standby. |
| **`backup:export`** | `npx tsx scripts/sync-firestore.ts export [archivo.json]` | Exporta todas las colecciones y subcolecciones granulares (`grades`, `history`) a un archivo JSON. |
| **`backup:import`** | `npx tsx scripts/sync-firestore.ts import <archivo.json> <target-id>` | Importa en lotes seguros (batches de 400 ops) los datos a un proyecto destino (ej. `teacher-productivity-kit-bk1`). |
| **`set-premium`** | `npx tsx scripts/set-premium.ts <correo>` | Asigna estado de suscripción Premium a un usuario en Firestore (entorno dev). |
| **`desktop:dev`** | `concurrently "vite" "wait-on ... && electron ."` | Inicia el servidor de desarrollo local y abre la aplicación en una ventana nativa de Electron (Escritorio). |
| **`desktop:build`** | `vite build && electron-builder` | Compila la aplicación y empaqueta el instalador ejecutable (`.exe`) para Windows utilizando Electron Builder. |

## Notas de Despliegue

*   **Entorno de Desarrollo (`dev`)**: Utiliza el proyecto Firebase `gen-lang-client...`.
*   **Entorno de Producción (`prod`)**: Utiliza el proyecto Firebase `teacher-productivity-kit`.
*   Para desplegar a cualquier entorno de hosting, asegúrate de ejecutar `npm run build` primero para actualizar la carpeta `dist`.

### Verificación Pre-Deploy
Corre tests + validación de tipos en un solo comando (~15s):
```bash
npm run check
```

### Actualizar Versión del Proyecto
Sincroniza la versión en `package.json` y `types.ts` (incluyendo timestamp de build).
```bash
npx tsx scripts/update-version.ts 1.9.0
```
### Organizar Feedback

```bash
npx tsx scripts/feedback-manager.ts npm run feedback        # Interactive mode
npm run feedback:auto   # Auto-export all, group by module, mark as reviewed

Para establecer suscripción Premium en Dev:
```bash
npx tsx scripts/set-premium.ts tu_correo@ejemplo.com
```

Para establecer rol de administrador:
```bash
npx tsx scripts/set-admin.ts tu_correo@ejemplo.com
```

Para cargar las api de desarrollo:
npx vite build --mode development

Para cargar las api de producción:
npx vite build --mode production    


En el caso de que por algún motivo se desactive el modo pago, hay que ir a:
```bash
cd functions
npm run build
firebase deploy --only functions
```

---

## Desarrollo Móvil (Android / Capacitor)

### 📱 Ejecutar en Dispositivo Físico o Emulador
*   **Listar dispositivos y emuladores disponibles:**
    ```bash
    npx cap run android --list
    ```
*   **Sincronizar cambios web compilados a la app nativa Android:**
    ```bash
    npm run build
    npx cap sync
    ```
*   **Abrir el proyecto en Android Studio:**
    ```bash
    npx cap open android
    ```

### ⚡ Live Reload (Desarrollo en Tiempo Real)
*   **Opción A: Por Wi-Fi (usando tu IP local de la red):**
    ```bash
    npx cap run android --live-reload --host <TU_IP_WIFI>
    # Ejemplo: npx cap run android --live-reload --host 10.0.0.6
    ```
*   **Opción B: Por Cable USB (vía ADB Reverse, sin depender de Wi-Fi):**
    ```bash
    adb reverse tcp:3000 tcp:3000
    npx cap run android --live-reload --host localhost
    ```

### 📦 Compilar APK Autónomo (Dev APIs)
*   **Compilar y empaquetar APK Debug autónomo con APIs de desarrollo:**
    ```powershell
    npx vite build --mode development
    npx cap sync android
    cd android
    .\gradlew.bat assembleDebug
    cd ..
    ```

### 🛠️ Utilidades ADB y Diagnóstico
*   **Verificar dispositivos conectados:**
    ```bash
    adb devices
    ```
*   **Reiniciar servidor ADB (si se congela o pierde la conexión):**
    ```bash
    adb kill-server && adb start-server && adb devices
    ```
*   **Instalar manualmente el APK de prueba (Debug APK):**
    ```bash
    adb install -r android/app/build/outputs/apk/debug/app-debug.apk
    ```
*   **Configurar `adb` en el PATH de Windows (PowerShell):**
    ```powershell
    [Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";$env:LOCALAPPDATA\Android\Sdk\platform-tools", "User")
    $env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
    ```
