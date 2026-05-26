import { ipcMain, dialog, app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../database/connection';

function queryAll(sql: string, params?: unknown[]): Record<string, unknown>[] {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const results: Record<string, unknown>[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return results;
}

function queryOne(sql: string, params?: unknown[]): Record<string, unknown> | null {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  let result: Record<string, unknown> | null = null;
  if (stmt.step()) {
    result = stmt.getAsObject() as Record<string, unknown>;
  }
  stmt.free();
  return result;
}

function execute(sql: string, params?: unknown[]): void {
  const db = getDatabase();
  db.run(sql, params);
  saveDatabase();
}

export function registerIpcHandlers(): void {
  ipcMain.handle('app:getPath', (_event, name: string) => {
    return app.getPath(name as Parameters<typeof app.getPath>[0]);
  });

  function normalizeConversation(row: Record<string, unknown>) {
    return {
      id: row.id,
      title: row.title,
      modelId: row.model_id || row.modelId || 'default',
      systemPrompt: row.system_prompt || row.systemPrompt || null,
      characterId: row.character_id || row.characterId || null,
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
      isPinned: row.is_pinned ?? row.isPinned ?? 0,
      isArchived: row.is_archived ?? row.isArchived ?? 0,
    };
  }

  function normalizeMessage(row: Record<string, unknown>) {
    return {
      id: row.id,
      conversationId: row.conversation_id || row.conversationId,
      role: row.role,
      content: row.content,
      tokenCount: row.token_count ?? row.tokenCount ?? null,
      createdAt: row.created_at ?? row.createdAt,
    };
  }

  function normalizeCharacter(row: Record<string, unknown>) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      systemPrompt: row.system_prompt || row.systemPrompt,
      avatar: row.avatar || null,
      isBuiltin: row.is_builtin ?? row.isBuiltin ?? 0,
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
    };
  }

  // ============ 对话相关 ============
  ipcMain.handle('conversation:list', () => {
    return queryAll(
      'SELECT * FROM conversations WHERE is_archived = 0 ORDER BY is_pinned DESC, updated_at DESC',
    ).map(normalizeConversation);
  });

  ipcMain.handle('conversation:create', (_event, title?: string) => {
    const id = uuidv4();
    const now = Date.now();
    execute(
      'INSERT INTO conversations (id, title, model_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, title || '新对话', 'default', now, now],
    );
    const row = queryOne('SELECT * FROM conversations WHERE id = ?', [id]);
    return row ? normalizeConversation(row) : null;
  });

  ipcMain.handle(
    'conversation:update',
    (_event, cid: string, data: Record<string, unknown>) => {
      const entries = Object.entries(data);
      if (entries.length === 0) return;
      const setClauses = entries.map(([k]) => `${k} = ?`).join(', ');
      const values = entries.map(([, v]) => v);
      execute(
        `UPDATE conversations SET ${setClauses}, updated_at = ? WHERE id = ?`,
        [...values, Date.now(), cid],
      );
      const row = queryOne('SELECT * FROM conversations WHERE id = ?', [cid]);
      return row ? normalizeConversation(row) : null;
    },
  );

  ipcMain.handle('conversation:delete', (_event, cid: string) => {
    const db = getDatabase();
    db.run('DELETE FROM conversations WHERE id = ?', [cid]);
    saveDatabase();
  });

  // ============ 消息相关 ============
  ipcMain.handle('message:list', (_event, conversationId: string) => {
    return queryAll(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId],
    ).map(normalizeMessage);
  });

  ipcMain.handle(
    'message:create',
    (_event, conversationId: string, role: string, content: string) => {
      const id = uuidv4();
      const now = Date.now();
      execute(
        'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, conversationId, role, content, now],
      );
      execute('UPDATE conversations SET updated_at = ? WHERE id = ?', [now, conversationId]);
      const row = queryOne('SELECT * FROM messages WHERE id = ?', [id]);
      return row ? normalizeMessage(row) : null;
    },
  );

  ipcMain.handle('message:update', (_event, mid: string, content: string) => {
    execute('UPDATE messages SET content = ? WHERE id = ?', [content, mid]);
    const row = queryOne('SELECT * FROM messages WHERE id = ?', [mid]);
    return row ? normalizeMessage(row) : null;
  });

  ipcMain.handle('message:delete', (_event, mid: string) => {
    const db = getDatabase();
    db.run('DELETE FROM messages WHERE id = ?', [mid]);
    saveDatabase();
  });

  // ============ AI角色相关 ============
  ipcMain.handle('character:list', () => {
    return queryAll('SELECT * FROM characters ORDER BY is_builtin DESC, created_at ASC').map(normalizeCharacter);
  });

  ipcMain.handle(
    'character:create',
    (
      _event,
      data: { name: string; description: string; systemPrompt: string; avatar: string },
    ) => {
      const id = uuidv4();
      const now = Date.now();
      execute(
        'INSERT INTO characters (id, name, description, system_prompt, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, data.name, data.description, data.systemPrompt, data.avatar, now, now],
      );
      const row = queryOne('SELECT * FROM characters WHERE id = ?', [id]);
      return row ? normalizeCharacter(row) : null;
    },
  );

  ipcMain.handle(
    'character:update',
    (_event, cid: string, data: Record<string, unknown>) => {
      const entries = Object.entries(data);
      if (entries.length === 0) return;
      const setClauses = entries.map(([k]) => `${k} = ?`).join(', ');
      const values = entries.map(([, v]) => v);
      execute(
        `UPDATE characters SET ${setClauses}, updated_at = ? WHERE id = ?`,
        [...values, Date.now(), cid],
      );
      const row = queryOne('SELECT * FROM characters WHERE id = ?', [cid]);
      return row ? normalizeCharacter(row) : null;
    },
  );

  ipcMain.handle('character:delete', (_event, cid: string) => {
    const db = getDatabase();
    db.run('DELETE FROM characters WHERE id = ? AND is_builtin = 0', [cid]);
    saveDatabase();
  });

  // ============ 模型配置相关 ============
  function normalizeModel(row: Record<string, unknown>) {
    return {
      id: row.id,
      provider: row.provider,
      modelName: row.model_name || row.modelName,
      displayName: row.display_name || row.displayName,
      apiKey: row.api_key || row.apiKey,
      baseUrl: row.base_url || row.baseUrl,
      isEnabled: row.is_enabled ?? row.isEnabled ?? true,
      createdAt: row.created_at ?? row.createdAt,
    };
  }

  ipcMain.handle('model:list', () => {
    return queryAll('SELECT * FROM model_configs ORDER BY sort_order ASC').map(normalizeModel);
  });

  ipcMain.handle('model:create', (_event, data: Record<string, unknown>) => {
    const id = uuidv4();
    const now = Date.now();
    execute(
      'INSERT INTO model_configs (id, provider, model_name, display_name, api_key, base_url, parameters, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.provider,
        data.modelName,
        data.displayName,
        data.apiKey,
        data.baseUrl || null,
        data.parameters ? JSON.stringify(data.parameters) : null,
        now,
      ],
    );
    const row = queryOne('SELECT * FROM model_configs WHERE id = ?', [id]);
    return row ? normalizeModel(row) : null;
  });

  ipcMain.handle(
    'model:update',
    (_event, mid: string, data: Record<string, unknown>) => {
      const entries = Object.entries(data);
      if (entries.length === 0) return;
      const setClauses = entries.map(([k]) => `${k} = ?`).join(', ');
      const values = entries.map(([, v]) => v);
      execute(`UPDATE model_configs SET ${setClauses} WHERE id = ?`, [...values, mid]);
      const row = queryOne('SELECT * FROM model_configs WHERE id = ?', [mid]);
      return row ? normalizeModel(row) : null;
    },
  );

  ipcMain.handle('model:delete', (_event, mid: string) => {
    const db = getDatabase();
    db.run('DELETE FROM model_configs WHERE id = ?', [mid]);
    saveDatabase();
  });

  // ============ 设置相关 ============
  ipcMain.handle('settings:get', (_event, key: string) => {
    const row = queryOne('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
  });

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    const now = Date.now();
    execute(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?',
      [key, value, now, value, now],
    );
  });

  // ============ 文件对话框 ============
  ipcMain.handle(
    'dialog:openFile',
    async (_event, options: { filters?: { name: string; extensions: string[] }[] }) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: options.filters,
      });
      return result.canceled ? null : result.filePaths[0];
    },
  );

  ipcMain.handle(
    'dialog:openFiles',
    async (_event, options: { filters?: { name: string; extensions: string[] }[] }) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: options.filters,
      });
      return result.canceled ? [] : result.filePaths;
    },
  );
}
