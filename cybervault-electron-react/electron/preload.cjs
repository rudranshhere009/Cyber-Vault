// Use CommonJS to avoid ESM issues in Electron preload
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  forceRepaint: () => ipcRenderer.send('force-repaint'),
  
  // WebAuthn credential storage methods
  readCredentialStore: (filename) => ipcRenderer.invoke('read-credential-store', filename),
  writeCredentialStore: (filename, data) => ipcRenderer.invoke('write-credential-store', filename, data),

  saveAuditReport: (defaultName, payload) => ipcRenderer.invoke('save-audit-report', defaultName, payload),
  saveAuditReportPdf: (defaultName, html) => ipcRenderer.invoke('save-audit-report-pdf', defaultName, html),
  saveThreatLog: (defaultName, payload) => ipcRenderer.invoke('save-threat-log', defaultName, payload),
  saveVaultBackup: (defaultName, payload) => ipcRenderer.invoke('save-vault-backup', defaultName, payload),
  openaiOcrAnswer: (payload) => ipcRenderer.invoke('openai-ocr-answer', payload),
});
