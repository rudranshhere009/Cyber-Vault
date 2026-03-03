import { app, BrowserWindow, shell, ipcMain, dialog, session } from 'electron';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { initCyberVaultDb, UserModel, LoginEventModel, FileOwnershipModel, getDbInsights } from './db.js';
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
  initCyberVaultDb(app.getPath('userData')).catch((error) => {
    console.error('Failed to initialize CyberVault database:', error);
  });

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

ipcMain.handle('db-get-user', async (event, email) => {
  try {
    if (!email) return null;
    return await UserModel.findByEmail(String(email).toLowerCase());
  } catch (error) {
    console.error('Error fetching user from DB:', error);
    throw error;
  }
});

ipcMain.handle('db-upsert-user', async (event, user) => {
  try {
    if (!user?.email) throw new Error('email_required');
    return await UserModel.upsert({
      ...user,
      email: String(user.email).toLowerCase(),
    });
  } catch (error) {
    console.error('Error upserting user in DB:', error);
    throw error;
  }
});

ipcMain.handle('db-record-login', async (event, payload) => {
  try {
    if (!payload?.email) throw new Error('email_required');
    await LoginEventModel.create({
      email: String(payload.email).toLowerCase(),
      method: payload.method || 'password',
      success: payload.success !== false,
      loggedInAt: payload.loggedInAt || new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error recording login in DB:', error);
    throw error;
  }
});

ipcMain.handle('db-replace-user-files', async (event, payload) => {
  try {
    if (!payload?.email) throw new Error('email_required');
    await FileOwnershipModel.replaceForUser(String(payload.email).toLowerCase(), Array.isArray(payload.files) ? payload.files : []);
    return true;
  } catch (error) {
    console.error('Error replacing user files in DB:', error);
    throw error;
  }
});

ipcMain.handle('db-get-insights', async () => {
  try {
    return await getDbInsights();
  } catch (error) {
    console.error('Error fetching DB insights:', error);
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

const handleGroqOcrAnswer = async (payload) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { error: 'missing_api_key' };
    }
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    const flattenContentToText = (content) => {
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .map((part) => {
            if (!part) return '';
            if (typeof part === 'string') return part;
            if (typeof part?.text === 'string') return part.text;
            return '';
          })
          .filter(Boolean)
          .join('\n');
      }
      if (content && typeof content?.text === 'string') return content.text;
      return '';
    };

    const normalizeMessages = (rawInput) => {
      if (!rawInput) return [];
      if (!Array.isArray(rawInput)) {
        const text = flattenContentToText(rawInput);
        return text ? [{ role: 'user', content: text }] : [];
      }
      return rawInput
        .map((msg) => {
          const role = ['system', 'user', 'assistant'].includes(msg?.role) ? msg.role : 'user';
          const content = flattenContentToText(msg?.content);
          return content ? { role, content } : null;
        })
        .filter(Boolean);
    };

    const messages = normalizeMessages(payload?.input);
    if (!messages.length) {
      return { error: 'invalid_payload', detail: 'No valid prompt content found.' };
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 500,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { error: 'api_error', detail: text };
    }
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content || '';
    return { data: { output_text: String(out || '').trim() } };
  } catch (error) {
    console.error('Groq OCR answer error:', error);
    return { error: 'exception', detail: String(error) };
  }
};

ipcMain.handle('groq-ocr-answer', async (event, payload) => {
  return handleGroqOcrAnswer(payload);
});

// Backward compatibility for older renderer builds that still invoke the old channel name.
ipcMain.handle('openai-ocr-answer', async (event, payload) => {
  return handleGroqOcrAnswer(payload);
});

ipcMain.handle('openai-ocr-extract-text', async (event, payload) => {
  try {
    return { error: 'provider_disabled', detail: 'Vision OCR via OpenAI has been disabled. Use Google Vision or Tesseract fallback.' };
  } catch (error) {
    console.error('Vision OCR bridge error:', error);
    return { error: 'exception', detail: String(error) };
  }
});

ipcMain.handle('google-ocr-extract-text', async (event, payload) => {
  try {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) return { error: 'missing_api_key' };
    const imageDataUrl = payload?.imageDataUrl;
    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return { error: 'invalid_payload' };
    }

    const base64 = imageDataUrl.split(',')[1] || '';
    if (!base64) return { error: 'invalid_payload' };

    const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return { error: 'api_error', detail };
    }

    const data = await res.json();
    const text = data?.responses?.[0]?.fullTextAnnotation?.text || data?.responses?.[0]?.textAnnotations?.[0]?.description || '';
    return { data: { text: String(text || '').trim() } };
  } catch (error) {
    console.error('Google OCR extract error:', error);
    return { error: 'exception', detail: String(error) };
  }
});
