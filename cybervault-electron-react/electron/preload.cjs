// Use CommonJS to avoid ESM issues in Electron preload
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  forceRepaint: () => ipcRenderer.send('force-repaint'),
  
  // WebAuthn credential storage methods
  readCredentialStore: (filename) => ipcRenderer.invoke('read-credential-store', filename),
  writeCredentialStore: (filename, data) => ipcRenderer.invoke('write-credential-store', filename, data),
});
