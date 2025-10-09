import { app, BrowserWindow, shell, ipcMain } from 'electron';
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
