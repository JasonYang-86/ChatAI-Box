import { ipcMain, dialog } from 'electron';
import * as fsOps from '../services/file-system';

export function registerFileIpc(): void {
  ipcMain.handle('file:openWorkDir', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择工作目录',
    });
    if (result.canceled || !result.filePaths[0]) return null;
    try {
      fsOps.setWorkDir(result.filePaths[0]);
      return fsOps.getWorkDir();
    } catch (e: unknown) {
      return { error: (e as Error).message };
    }
  });

  ipcMain.handle('file:setWorkDir', (_event, dir: string) => {
    try {
      fsOps.setWorkDir(dir);
      return { path: fsOps.getWorkDir() };
    } catch (e: unknown) {
      return { error: (e as Error).message };
    }
  });

  ipcMain.handle('file:getWorkDir', () => fsOps.getWorkDir());

  ipcMain.handle('file:list', (_event, dirPath: string) => {
    try { return { files: fsOps.listDir(dirPath || '.') }; }
    catch (e: unknown) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('file:read', (_event, filePath: string) => {
    try { return { content: fsOps.readFileContent(filePath) }; }
    catch (e: unknown) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('file:write', (_event, filePath: string, content: string) => {
    try { fsOps.writeFileContent(filePath, content); return { success: true }; }
    catch (e: unknown) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('file:delete', (_event, filePath: string) => {
    try { fsOps.deleteFileOrDir(filePath); return { success: true }; }
    catch (e: unknown) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('file:rename', (_event, oldPath: string, newName: string) => {
    try { return { newPath: fsOps.renameFileOrDir(oldPath, newName) }; }
    catch (e: unknown) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('file:createDir', (_event, dirPath: string) => {
    try { fsOps.createDir(dirPath); return { success: true }; }
    catch (e: unknown) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('file:createFile', (_event, filePath: string, content: string) => {
    try { fsOps.createFile(filePath, content || ''); return { success: true }; }
    catch (e: unknown) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('file:readBinary', (_event, filePath: string) => {
    try { return fsOps.readFileBinary(filePath); }
    catch (e: unknown) { return { error: (e as Error).message }; }
  });
}
