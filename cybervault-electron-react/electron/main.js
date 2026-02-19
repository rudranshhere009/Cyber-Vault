import { app, BrowserWindow, shell, ipcMain, dialog, session } from 'electron';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged; // 👈 safer check

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 680,
    frame: true,
    resizable: true,
    show: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'), // 👈 updated to .cjs
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // 👈 sandbox false so preload IPC works fine
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  if (!isDev) {
    const csp = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'self' blob:",
    ].join('; ');

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = details.responseHeaders || {};
      headers['Content-Security-Policy'] = [csp];
      callback({ responseHeaders: headers });
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('force-repaint', () => {
  if (mainWindow) {
    mainWindow.minimize();
    mainWindow.restore();
  }
});

// WebAuthn credential storage IPC handlers
import fs from 'fs/promises';

ipcMain.handle('read-credential-store', async (event, filename) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, return null
      return null;
    }
    
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading credential store:', error);
    throw error;
  }
});

ipcMain.handle('write-credential-store', async (event, filename, data) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, filename);
    
    // Ensure directory exists
    await fs.mkdir(userDataPath, { recursive: true });
    
    // Write encrypted data to file
    await fs.writeFile(filePath, JSON.stringify(data), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing credential store:', error);
    throw error;
  }
});

// Vault index persistence (files metadata)
const VAULT_INDEX_FILENAME = 'cybervault_vault_index.json';

ipcMain.handle('read-vault-index', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, VAULT_INDEX_FILENAME);
    try {
      await fs.access(filePath);
    } catch {
      return null;
    }
    const data = await fs.readFile(filePath, 'utf8');
    try {
      return JSON.parse(data);
    } catch (parseErr) {
      console.error('Vault index JSON parse error, returning empty index:', parseErr);
      // Attempt to repair by overwriting with empty object, but don't throw to avoid crashing dev session
      try {
        await fs.writeFile(filePath, JSON.stringify({}), 'utf8');
      } catch (e) {
        console.error('Failed to repair vault index file:', e);
      }
      return {};
    }
  } catch (error) {
    console.error('Error reading vault index:', error);
    throw error;
  }
});

ipcMain.handle('write-vault-index', async (event, data) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, VAULT_INDEX_FILENAME);
    await fs.mkdir(userDataPath, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing vault index:', error);
    throw error;
  }
});

// App state persistence (session + misc)
const APP_STATE_FILENAME = 'cybervault_app_state.json';

ipcMain.handle('read-app-state', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, APP_STATE_FILENAME);
    try {
      await fs.access(filePath);
    } catch {
      return null;
    }
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading app state:', error);
    throw error;
  }
});

ipcMain.handle('write-app-state', async (event, data) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, APP_STATE_FILENAME);
    await fs.mkdir(userDataPath, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing app state:', error);
    throw error;
  }
});

// Vault blob persistence (encrypted file bytes)
const VAULT_BLOBS_DIR = 'cybervault_blobs';

ipcMain.handle('write-vault-blob', async (event, filename, bytes) => {
  try {
    const userDataPath = app.getPath('userData');
    const dirPath = path.join(userDataPath, VAULT_BLOBS_DIR);
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, filename);
    await fs.writeFile(filePath, Buffer.from(bytes));
    return true;
  } catch (error) {
    console.error('Error writing vault blob:', error);
    throw error;
  }
});

ipcMain.handle('read-vault-blob', async (event, filename) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, VAULT_BLOBS_DIR, filename);
    try {
      await fs.access(filePath);
    } catch {
      return null;
    }
    const data = await fs.readFile(filePath);
    return Array.from(data);
  } catch (error) {
    console.error('Error reading vault blob:', error);
    throw error;
  }
});

ipcMain.handle('delete-vault-blob', async (event, filename) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, VAULT_BLOBS_DIR, filename);
    try {
      await fs.unlink(filePath);
    } catch {
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error deleting vault blob:', error);
    throw error;
  }
});

ipcMain.handle('save-audit-report', async (event, defaultName, payload) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Audit Report',
      defaultPath: defaultName || 'cybervault_audit.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { canceled: true };
    await fs.writeFile(filePath, payload, 'utf8');
    return { canceled: false, filePath };
  } catch (error) {
    console.error('Error saving audit report:', error);
    throw error;
  }
});

ipcMain.handle('save-audit-report-pdf', async (event, defaultName, html) => {
  let win;
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Audit Report (PDF)',
      defaultPath: defaultName || 'cybervault_audit.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { canceled: true };

    win = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
      },
    });

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      marginsType: 1,
      pageSize: 'A4',
    });
    await fs.writeFile(filePath, pdfBuffer);
    return { canceled: false, filePath };
  } catch (error) {
    console.error('Error saving audit report PDF:', error);
    throw error;
  } finally {
    if (win) win.close();
  }
});

ipcMain.handle('save-threat-log', async (event, defaultName, payload) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Threat Log',
      defaultPath: defaultName || 'cybervault_threat_log.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { canceled: true };
    await fs.writeFile(filePath, payload, 'utf8');
    return { canceled: false, filePath };
  } catch (error) {
    console.error('Error saving threat log:', error);
    throw error;
  }
});

ipcMain.handle('save-vault-backup', async (event, defaultName, payload) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Vault Backup',
      defaultPath: defaultName || 'cybervault_backup.cybvlt',
      filters: [{ name: 'CyberVault Backup', extensions: ['cybvlt', 'json'] }],
    });
    if (canceled || !filePath) return { canceled: true };
    await fs.writeFile(filePath, payload, 'utf8');
    return { canceled: false, filePath };
  } catch (error) {
    console.error('Error saving vault backup:', error);
    throw error;
  }
});

ipcMain.handle('openai-ocr-answer', async (event, payload) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { error: 'missing_api_key' };
    }
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
    if (process.env.OPENAI_PROJECT) headers['OpenAI-Project'] = process.env.OPENAI_PROJECT;
    if (process.env.OPENAI_ORG) headers['OpenAI-Organization'] = process.env.OPENAI_ORG;

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        input: payload.input,
        temperature: 0.2,
        max_output_tokens: 500,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { error: 'api_error', detail: text };
    }
    const data = await res.json();
    return { data };
  } catch (error) {
    console.error('OpenAI OCR error:', error);
    return { error: 'exception', detail: String(error) };
  }
});
