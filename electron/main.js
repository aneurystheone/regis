import { app, BrowserWindow, protocol, net, shell, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

// Registrar esquema personalizado como estándar y seguro para Firebase Auth y recursos
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true,
    }
  }
]);

// IPC Event Listeners para el control de la ventana personalizada (frame: false)
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.minimize();
  }
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.close();
  }
});

ipcMain.handle('window-is-maximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win && !win.isDestroyed() ? win.isMaximized() : false;
});

// ── OAuth Flow for Desktop ──────────────────────────────────────────────
// Opens a child BrowserWindow for Google OAuth, intercepts the redirect
// containing the id_token, and returns it to the renderer.
ipcMain.handle('oauth-login', async (event, provider) => {
  return new Promise((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Build the Google OAuth URL using Firebase's auth handler
    const clientId = '158174574994-qn6q3kt2nmmf6j01bh4cl1n54il8a1mr.apps.googleusercontent.com'; // TODO: replace with real OAuth client ID
    const redirectUri = `https://teacher-productivity-kit.firebaseapp.com/__/auth/handler`;
    const scopes = 'email profile openid';

    let authUrl;
    if (provider === 'google') {
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=id_token` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&nonce=${Date.now()}` +
        `&prompt=select_account`;
    } else {
      authWindow.close();
      reject(new Error(`OAuth provider "${provider}" not supported in desktop mode.`));
      return;
    }

    authWindow.loadURL(authUrl);

    // Intercept the redirect to capture the id_token from the URL fragment
    authWindow.webContents.on('will-redirect', (e, url) => {
      try {
        const hash = new URL(url).hash;
        if (hash && hash.includes('id_token=')) {
          const params = new URLSearchParams(hash.substring(1));
          const idToken = params.get('id_token');
          if (idToken) {
            authWindow.close();
            resolve({ idToken, provider });
            return;
          }
        }
      } catch (err) {
        // not the redirect we're looking for, continue
      }
    });

    // Also check page navigation (some flows use navigation instead of redirect)
    authWindow.webContents.on('will-navigate', (e, url) => {
      try {
        const hash = new URL(url).hash;
        if (hash && hash.includes('id_token=')) {
          const params = new URLSearchParams(hash.substring(1));
          const idToken = params.get('id_token');
          if (idToken) {
            e.preventDefault();
            authWindow.close();
            resolve({ idToken, provider });
            return;
          }
        }
      } catch (err) {
        // not the redirect we're looking for
      }
    });

    authWindow.on('closed', () => {
      // If the window was closed without capturing a token, the user cancelled
      resolve(null);
    });
  });
});

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show: false,
    backgroundColor: '#F5F7FA',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/logo.png'),
    autoHideMenuBar: true,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Configurar el manejo de ventanas emergentes (OAuth popups de Firebase: Google, Facebook, Apple)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes('accounts.google.com') ||
      url.includes('facebook.com') ||
      url.includes('appleid.apple.com') ||
      url.includes('firebaseapp.com/__/auth/handler') ||
      url.includes('identitytoolkit.googleapis.com')
    ) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          }
        }
      };
    }

    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    // En desarrollo, apuntar al servidor de Vite
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // En producción: usar el esquema personalizado
    mainWindow.loadURL('app://regis.app/index.html');
  }
}

app.whenReady().then(() => {
  if (!isDev) {
    const distPath = path.join(__dirname, '../dist');
    const resolvedDist = path.resolve(distPath);

    protocol.handle('app', (request) => {
      const url = new URL(request.url);

      if (url.hostname === 'regis.app') {
        let urlPath = url.pathname;
        if (urlPath === '') urlPath = '/';

        // --- Prevención de Path Traversal ---
        const resolved = path.resolve(resolvedDist, '.' + urlPath);
        if (!resolved.startsWith(resolvedDist + path.sep) && resolved !== resolvedDist) {
          return new Response('Forbidden', { status: 403 });
        }

        let filePath = resolved;

        // SPA Fallback: si el archivo no existe, servir index.html
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          filePath = path.join(resolvedDist, 'index.html');
        }

        // Retornar el archivo usando el esquema nativo file:// de Electron
        return net.fetch('file://' + filePath);
      }

      return new Response('Not Found', { status: 404 });
    });
  }

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
