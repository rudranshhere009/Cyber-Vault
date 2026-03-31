import { app, BrowserWindow, shell, ipcMain, dialog, session } from 'electron';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initCyberVaultDb, UserModel, LoginEventModel, FileOwnershipModel, getDbInsights } from './db.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files from app root regardless of process cwd.
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

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

const aiSessionStore = new Map();
const MAX_AI_SESSIONS = 100;

const handleGroqOcrAnswer = async (payload) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return { error: 'missing_api_key' };

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

    const extractQuestionFromLegacyInput = (rawInput) => {
      const msgs = normalizeMessages(rawInput);
      if (!msgs.length) return '';
      return String(msgs[msgs.length - 1]?.content || '').trim();
    };

    const callGroq = async ({ messages, temperature = 0.2, maxTokens = 600 }) => {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        const err = new Error('api_error');
        err.apiDetail = detail;
        throw err;
      }
      const data = await res.json();
      return String(data?.choices?.[0]?.message?.content || '').trim();
    };

    const pruneSessions = () => {
      if (aiSessionStore.size <= MAX_AI_SESSIONS) return;
      const oldest = Array.from(aiSessionStore.entries()).sort((a, b) => (a[1]?.lastSeen || 0) - (b[1]?.lastSeen || 0));
      const extra = aiSessionStore.size - MAX_AI_SESSIONS;
      for (let i = 0; i < extra; i += 1) aiSessionStore.delete(oldest[i][0]);
    };

    const sessionId = String(payload?.sessionId || 'default');
    let session = aiSessionStore.get(sessionId) || {
      fileSignature: '',
      fileContext: '',
      history: [],
      lastSeen: Date.now(),
    };

    const file = payload?.file;
    if (file?.base64) {
      const fileName = String(file?.name || 'document.bin');
      const fileType = String(file?.type || 'application/octet-stream');
      const rawBase64 = String(file?.base64 || '');
      const signature = `${fileName}|${fileType}|${rawBase64.length}|${rawBase64.slice(0, 32)}`;

      if (signature !== session.fileSignature) {
        let fileContext = '';
        if (/^image\//i.test(fileType)) {
          const imageMessages = [
            {
              role: 'system',
              content:
                'You are a document grounding engine. Build a concise context capsule from this image for future Q&A. Include key entities, dates, roles, skills, education, contacts, and notable facts. Keep it compact and factual.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Create context capsule for file ${fileName} (${fileType}).` },
                { type: 'image_url', image_url: { url: `data:${fileType};base64,${rawBase64}` } },
              ],
            },
          ];
          fileContext = await callGroq({ messages: imageMessages, temperature: 0.0, maxTokens: 900 });
        } else {
          const initialCap = Number(process.env.GROQ_FILE_BASE64_MAX_CHARS || 24000);
          const minCap = 4000;
          let cap = Math.max(minCap, initialCap);
          while (cap >= minCap) {
            const safeBase64 = rawBase64.slice(0, cap);
            const truncated = rawBase64.length > cap;
            const nonImageMessages = [
              {
                role: 'system',
                content:
                  'You are a document grounding engine. Build a concise context capsule from attached file payload for future Q&A. Include key entities, dates, roles, skills, education, contacts, and important details. If payload is partial, mention that.',
              },
              {
                role: 'user',
                content: `File name: ${fileName}
File type: ${fileType}
Payload status: ${truncated ? `truncated to first ${cap} base64 chars` : 'full payload'}
File base64 payload:
${safeBase64}`,
              },
            ];
            try {
              fileContext = await callGroq({ messages: nonImageMessages, temperature: 0.0, maxTokens: 900 });
              break;
            } catch (ingestErr) {
              const detail = String(ingestErr?.apiDetail || ingestErr?.message || '');
              const tooLarge = /rate_limit_exceeded|request too large|reduce your message size|tokens per minute|tpm/i.test(detail);
              if (tooLarge && cap > minCap) {
                cap = Math.floor(cap * 0.6);
                continue;
              }
              throw ingestErr;
            }
          }
        }

        session = {
          fileSignature: signature,
          fileContext: String(fileContext || '').slice(0, 12000),
          history: [],
          lastSeen: Date.now(),
        };
      }
    }

    if (payload?.ingestOnly) {
      session.lastSeen = Date.now();
      aiSessionStore.set(sessionId, session);
      pruneSessions();
      return { data: { output_text: 'File context initialized.' } };
    }

    const question = String(payload?.question || '').trim() || extractQuestionFromLegacyInput(payload?.input);
    if (!question) return { error: 'invalid_payload', detail: 'No question provided.' };

    const answerMessages = [
      {
        role: 'system',
        content:
          'You are CyberVault assistant. Answer casual queries naturally. If file context is present, use it when relevant. If user asks file-specific details not present in context, say it is not available.',
      },
    ];
    if (session.fileContext) {
      answerMessages.push({
        role: 'system',
        content: `File context capsule:\n${session.fileContext}`,
      });
    }
    if (Array.isArray(session.history) && session.history.length) {
      answerMessages.push(...session.history.slice(-10));
    }
    answerMessages.push({ role: 'user', content: question });

    const out = await callGroq({ messages: answerMessages, temperature: 0.2, maxTokens: 650 });
    const reply = String(out || '').trim();
    if (!reply) return { error: 'api_error', detail: 'Empty response from model.' };

    session.history = [...(session.history || []), { role: 'user', content: question }, { role: 'assistant', content: reply }].slice(-12);
    session.lastSeen = Date.now();
    aiSessionStore.set(sessionId, session);
    pruneSessions();
    return { data: { output_text: reply } };
  } catch (error) {
    if (error?.message === 'api_error' && error?.apiDetail) {
      return { error: 'api_error', detail: String(error.apiDetail) };
    }
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
