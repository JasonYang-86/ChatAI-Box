/**
 * 记忆系统 IPC 通道
 */

import { ipcMain, app } from 'electron';
import path from 'path';
import { MemoryManager } from '../services/memory';

let memoryManager: MemoryManager | null = null;

function getMemoryManager(): MemoryManager {
  if (!memoryManager) {
    const userDataPath = app.getPath('userData');
    const memoryPath = path.join(userDataPath, 'memory.json');
    memoryManager = new MemoryManager(memoryPath);
  }
  return memoryManager;
}

export function registerMemoryIpc(): void {
  const mm = getMemoryManager();

  // ============ 搜索 ============
  ipcMain.handle(
    'memory:search',
    (
      _event,
      params: {
        query: string;
        topK?: number;
        minScore?: number;
        includeMessages?: boolean;
      },
    ) => {
      return mm.search(
        params.query,
        params.topK ?? 5,
        params.minScore ?? 0,
        params.includeMessages ?? false,
      );
    },
  );

  // ============ 构建上下文 ============
  ipcMain.handle(
    'memory:context',
    (
      _event,
      params: {
        query: string;
        topK?: number;
        minScore?: number;
        maxContextChars?: number;
      },
    ) => {
      return mm.buildContext(
        params.query,
        params.topK ?? 5,
        params.minScore ?? 0.2,
        params.maxContextChars ?? 8000,
      );
    },
  );

  // ============ 添加对话到记忆 ============
  ipcMain.handle(
    'memory:add',
    (
      _event,
      params: {
        conversationId: string;
        title: string;
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        tags?: string[];
      },
    ) => {
      return mm.addConversation(
        params.conversationId,
        params.title,
        params.messages,
        params.tags ?? [],
      );
    },
  );

  // ============ 插入或更新记忆 ============
  ipcMain.handle(
    'memory:upsert',
    (
      _event,
      params: {
        conversationId: string;
        title: string;
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        tags?: string[];
      },
    ) => {
      return mm.upsertByConversationId(
        params.conversationId,
        params.title,
        params.messages,
        params.tags ?? [],
      );
    },
  );

  // ============ 更新记忆对话 ============
  ipcMain.handle(
    'memory:update',
    (
      _event,
      params: {
        id: string;
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        title?: string;
      },
    ) => {
      return mm.updateConversation(params.id, params.messages, params.title);
    },
  );

  // ============ 删除记忆 ============
  ipcMain.handle('memory:delete', (_event, id: string) => {
    return mm.deleteConversation(id);
  });

  // ============ 列出记忆 ============
  ipcMain.handle('memory:list', (_event, limit?: number) => {
    return mm.listConversations(limit ?? 50);
  });

  // ============ 获取单条记忆 ============
  ipcMain.handle('memory:get', (_event, id: string) => {
    return mm.getConversation(id);
  });

  // ============ 统计 ============
  ipcMain.handle('memory:stats', () => {
    return mm.getStats();
  });

  // ============ 管理 ============
  ipcMain.handle('memory:rebuild', () => {
    mm.rebuildEmbeddings();
    return { success: true };
  });

  ipcMain.handle('memory:clear', () => {
    mm.clearAll();
    return { success: true };
  });
}
