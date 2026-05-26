import { ipcMain, BrowserWindow } from 'electron';
import { indexFile, searchKnowledge, removeFile, getKnowledgeStats, getSupportedExtensions } from '../services/rag';

export function registerKnowledgeIpc(): void {
  ipcMain.handle('knowledge:getSupportedExtensions', () => {
    return getSupportedExtensions();
  });

  ipcMain.handle('knowledge:getStats', async () => {
    return getKnowledgeStats();
  });

  ipcMain.handle(
    'knowledge:indexFile',
    async (
      _event,
      params: {
        filePath: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        apiKey: string;
        baseUrl?: string;
        model?: string;
      },
    ) => {
      const win = BrowserWindow.getFocusedWindow();
      try {
        const fileId = await indexFile(params, (progress) => {
          win?.webContents.send('knowledge:indexProgress', progress);
        });
        return { success: true, fileId };
      } catch (e) {
        return { success: false, error: (e as Error).message };
      }
    },
  );

  ipcMain.handle(
    'knowledge:search',
    async (
      _event,
      params: {
        query: string;
        apiKey: string;
        baseUrl?: string;
        model?: string;
        limit?: number;
      },
    ) => {
      try {
        const results = await searchKnowledge(params);
        return { success: true, results };
      } catch (e) {
        return { success: false, error: (e as Error).message, results: [] };
      }
    },
  );

  ipcMain.handle('knowledge:removeFile', async (_event, fileId: string) => {
    try {
      await removeFile(fileId);
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  });

  ipcMain.handle('knowledge:listFiles', () => {
    const { getDatabase } = require('../database/connection');
    const db = getDatabase();
    return db.prepare('SELECT * FROM knowledge_files ORDER BY created_at DESC').all();
  });
}
