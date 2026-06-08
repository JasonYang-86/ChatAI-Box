import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import { initDatabase, closeDatabase, saveDatabase } from './database/connection';
import { registerIpcHandlers } from './ipc';
import { registerChatIpc } from './ipc/chat.ipc';
import { registerKnowledgeIpc } from './ipc/knowledge.ipc';
import { registerMCPIpc, initMCP } from './ipc/mcp.ipc';
import { registerFileIpc } from './ipc/file.ipc';
import { registerMemoryIpc } from './ipc/memory.ipc';

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'ChatAI',
    icon: path.join(__dirname, '../resources/icons/icon.ico'),
    backgroundColor: '#FFFFFF',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupAutoUpdater() {
  if (isDev) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('app:update-status', { status: 'available' });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('app:update-status', { status: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('app:update-status', {
      status: 'downloading',
      progress: Math.round(progress.percent),
    });
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('app:update-status', { status: 'downloaded' });
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err.message);
  });

  autoUpdater.checkForUpdatesAndNotify().catch(() => {});

  ipcMain.handle('app:checkUpdate', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { updateAvailable: result?.updateInfo ? true : false };
    } catch {
      return { updateAvailable: false };
    }
  });

  ipcMain.handle('app:downloadUpdate', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch {
      return { success: false };
    }
  });

  ipcMain.handle('app:installUpdate', () => {
    autoUpdater.quitAndInstall();
    return true;
  });
}

app.whenReady().then(async () => {
  await initDatabase();
  registerIpcHandlers();
  registerChatIpc();
  registerKnowledgeIpc();
  registerMCPIpc();
  registerFileIpc();
  registerMemoryIpc();
  initMCP().catch((e) => console.error('MCP init error:', e));
  createWindow();
  setupAutoUpdater();

  setInterval(() => {
    try { saveDatabase(); } catch {}
  }, 30000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  app.quit();
});

app.on('before-quit', () => {
  closeDatabase();
});
