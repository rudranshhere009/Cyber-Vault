// Use CommonJS to avoid ESM issues in Electron preload
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  forceRepaint: () => ipcRenderer.send('force-repaint'),
});
