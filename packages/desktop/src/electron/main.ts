import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import * as path from 'path';

const isDev = !app.isPackaged;

// In-memory token store — replaced with keytar for production builds
let storedToken: string | null = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    title: 'Church Audio Manager',
  });

  if (isDev) {
    win.loadURL('http://localhost:4200');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../app/browser/index.html'));
  }

  // Open external links in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Intercept all requests to /api/admin/* and inject the JWT Authorization header.
// This is the key trick that lets Angular use a plain <audio [src]="streamUrl">
// without needing any custom fetch wrapper — Electron handles the header silently.
function installAuthInterceptor(apiOrigin: string) {
  const filter = { urls: [`${apiOrigin}/api/admin/*`] };

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const headers = { ...details.requestHeaders };
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }
    callback({ requestHeaders: headers });
  });
}

app.whenReady().then(() => {
  // Read API URL from env var so it can be overridden in production builds
  const apiOrigin = process.env['API_ORIGIN'] ?? 'http://localhost:5000';
  installAuthInterceptor(apiOrigin);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers — renderer communicates token changes via contextBridge
ipcMain.handle('auth:getToken', () => storedToken);
ipcMain.handle('auth:setToken', (_event, token: string | null) => {
  storedToken = token;
});
