import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../database/connection';
import { mcpManager } from '../services/mcp/mcp-manager';
import type { MCPServerConfig } from '../services/mcp/mcp-client';

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

function execute(sql: string, params?: unknown[]): void {
  const db = getDatabase();
  db.run(sql, params);
  saveDatabase();
}

function normalizeMCPServer(row: Record<string, unknown>): MCPServerConfig {
  let args: string[] = [];
  try {
    const parsed = JSON.parse(String(row.args || '[]'));
    args = Array.isArray(parsed) ? parsed : [];
  } catch {}

  let env: Record<string, string> | undefined;
  try {
    if (row.env) env = JSON.parse(String(row.env));
  } catch {}

  return {
    id: String(row.id),
    name: String(row.name),
    command: String(row.command),
    args,
    env,
    isEnabled: Boolean(row.is_enabled ?? 1),
    createdAt: Number(row.created_at ?? row.createdAt ?? Date.now()),
  };
}

export async function initMCP(): Promise<void> {
  const rows = queryAll('SELECT * FROM mcp_servers WHERE is_enabled = 1');
  const servers = rows.map(normalizeMCPServer);
  await mcpManager.loadServers(servers);
}

export function registerMCPIpc(): void {
  ipcMain.handle('mcp:list', () => {
    const rows = queryAll('SELECT * FROM mcp_servers ORDER BY created_at ASC');
    return rows.map(normalizeMCPServer);
  });

  ipcMain.handle(
    'mcp:create',
    (_event, data: { name: string; command: string; args: string[]; env?: Record<string, string> }) => {
      const id = uuidv4();
      const now = Date.now();
      execute(
        'INSERT INTO mcp_servers (id, name, command, args, env, is_enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, data.name, data.command, JSON.stringify(data.args || []), data.env ? JSON.stringify(data.env) : null, 1, now],
      );
      const row = queryAll('SELECT * FROM mcp_servers WHERE id = ?', [id])[0];
      const config = row ? normalizeMCPServer(row) : null;
      if (config) {
        mcpManager.startServer(config).catch((e) => console.error('Failed to start MCP server:', e));
      }
      return config;
    },
  );

  ipcMain.handle(
    'mcp:update',
    (_event, id: string, data: Partial<{ name: string; command: string; args: string[]; env: Record<string, string>; isEnabled: boolean }>) => {
      const setClauses: string[] = [];
      const values: unknown[] = [];

      if (data.name !== undefined) { setClauses.push('name = ?'); values.push(data.name); }
      if (data.command !== undefined) { setClauses.push('command = ?'); values.push(data.command); }
      if (data.args !== undefined) { setClauses.push('args = ?'); values.push(JSON.stringify(data.args)); }
      if (data.env !== undefined) { setClauses.push('env = ?'); values.push(JSON.stringify(data.env)); }
      if (data.isEnabled !== undefined) { setClauses.push('is_enabled = ?'); values.push(data.isEnabled ? 1 : 0); }

      if (setClauses.length === 0) return null;

      execute(`UPDATE mcp_servers SET ${setClauses.join(', ')} WHERE id = ?`, [...values, id]);
      const row = queryAll('SELECT * FROM mcp_servers WHERE id = ?', [id])[0];
      const config = row ? normalizeMCPServer(row) : null;
      if (config) {
        mcpManager.restartServer(config).catch((e) => console.error('Failed to restart MCP server:', e));
      }
      return config;
    },
  );

  ipcMain.handle('mcp:delete', (_event, id: string) => {
    mcpManager.stopServer(id).catch(() => {});
    const db = getDatabase();
    db.run('DELETE FROM mcp_servers WHERE id = ?', [id]);
    saveDatabase();
  });

  ipcMain.handle('mcp:toggle', async (_event, id: string, enabled: boolean) => {
    execute('UPDATE mcp_servers SET is_enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
    const row = queryAll('SELECT * FROM mcp_servers WHERE id = ?', [id])[0];
    const config = row ? normalizeMCPServer(row) : null;
    if (!config) return null;

    if (enabled) {
      await mcpManager.startServer(config).catch((e) => console.error('Failed to start MCP server:', e));
    } else {
      await mcpManager.stopServer(id);
    }
    return config;
  });

  ipcMain.handle('mcp:tools', () => {
    return mcpManager.getAllTools();
  });

  ipcMain.handle('mcp:execute', async (_event, toolName: string, args: Record<string, unknown>) => {
    try {
      const result = await mcpManager.executeTool(toolName, args);
      return result;
    } catch (e) {
      return { callId: '', name: toolName, content: (e as Error).message, isError: true };
    }
  });
}
