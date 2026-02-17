import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';

const isDev = !app.isPackaged;

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC: Securely store and retrieve the JWT token
// The renderer cannot access localStorage from the Electron main process,
// so we use a simple in-memory store here (replace with keytar for production)
let storedToken: string | null = null;

ipcMain.handle('auth:getToken', () => storedToken);
ipcMain.handle('auth:setToken', (_event, token: string | null) => { storedToken = token; });
