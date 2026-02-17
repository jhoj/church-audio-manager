import { contextBridge, ipcRenderer } from 'electron';

// Expose a minimal, safe API surface to the Angular renderer
contextBridge.exposeInMainWorld('electronAPI', {
  getToken: (): Promise<string | null> => ipcRenderer.invoke('auth:getToken'),
  setToken: (token: string | null): Promise<void> => ipcRenderer.invoke('auth:setToken', token),
});
