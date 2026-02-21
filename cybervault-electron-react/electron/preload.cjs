// Use CommonJS to avoid ESM issues in Electron preload
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  forceRepaint: () => ipcRenderer.send('force-repaint'),
  
  // WebAuthn credential storage methods
  readCredentialStore: (filename) => ipcRenderer.invoke('read-credential-store', filename),
  writeCredentialStore: (filename, data) => ipcRenderer.invoke('write-credential-store', filename, data),
  readVaultIndex: () => ipcRenderer.invoke('read-vault-index'),
  writeVaultIndex: (data) => ipcRenderer.invoke('write-vault-index', data),
  writeVaultBlob: (filename, bytes) => ipcRenderer.invoke('write-vault-blob', filename, bytes),
  readVaultBlob: (filename) => ipcRenderer.invoke('read-vault-blob', filename),
  deleteVaultBlob: (filename) => ipcRenderer.invoke('delete-vault-blob', filename),
  readAppState: () => ipcRenderer.invoke('read-app-state'),
  writeAppState: (data) => ipcRenderer.invoke('write-app-state', data),

  saveAuditReport: (defaultName, payload) => ipcRenderer.invoke('save-audit-report', defaultName, payload),
  saveAuditReportPdf: (defaultName, html) => ipcRenderer.invoke('save-audit-report-pdf', defaultName, html),
  saveThreatLog: (defaultName, payload) => ipcRenderer.invoke('save-threat-log', defaultName, payload),
  saveVaultBackup: (defaultName, payload) => ipcRenderer.invoke('save-vault-backup', defaultName, payload),
  openaiOcrAnswer: (payload) => ipcRenderer.invoke('openai-ocr-answer', payload),
  openaiOcrExtractText: (payload) => ipcRenderer.invoke('openai-ocr-extract-text', payload),
  googleOcrExtractText: (payload) => ipcRenderer.invoke('google-ocr-extract-text', payload),
});
