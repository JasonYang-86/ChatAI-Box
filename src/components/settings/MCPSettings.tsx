import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  isEnabled: boolean;
  createdAt: number;
}

export function MCPSettings() {
  const { t } = useTranslation();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    command: 'npx',
    args: '-y @modelcontextprotocol/server-filesystem C:\\',
    envStr: '',
  });

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const list = (await window.electronAPI.invoke('mcp:list')) as MCPServer[];
      setServers(list);
    } catch {}
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.command.trim()) return;
    const args = form.args.split(' ').filter(Boolean);
    let env: Record<string, string> | undefined;
    if (form.envStr.trim()) {
      env = {};
      for (const line of form.envStr.split('\n')) {
        const [k, ...v] = line.split('=');
        if (k) env[k.trim()] = v.join('=').trim();
      }
    }
    try {
      await window.electronAPI.invoke('mcp:create', {
        name: form.name.trim(),
        command: form.command.trim(),
        args,
        env,
      });
    } catch {}
    setForm({ name: '', command: 'npx', args: '', envStr: '' });
    setShowAdd(false);
    loadServers();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await window.electronAPI.invoke('mcp:toggle', id, enabled);
    } catch {}
    loadServers();
  };

  const handleDelete = async (id: string) => {
    try {
      await window.electronAPI.invoke('mcp:delete', id);
    } catch {}
    loadServers();
  };

  const startEdit = (srv: MCPServer) => {
    setEditingId(srv.id);
    setForm({
      name: srv.name,
      command: srv.command,
      args: srv.args.join(' '),
      envStr: srv.env ? Object.entries(srv.env).map(([k, v]) => `${k}=${v}`).join('\n') : '',
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const args = form.args.split(' ').filter(Boolean);
    let env: Record<string, string> | undefined;
    if (form.envStr.trim()) {
      env = {};
      for (const line of form.envStr.split('\n')) {
        const [k, ...v] = line.split('=');
        if (k) env[k.trim()] = v.join('=').trim();
      }
    }
    try {
      await window.electronAPI.invoke('mcp:update', editingId, {
        name: form.name.trim(),
        command: form.command.trim(),
        args,
        env,
      });
    } catch {}
    setEditingId(null);
    setForm({ name: '', command: 'npx', args: '', envStr: '' });
    loadServers();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">MCP 服务器</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="btn-secondary text-xs py-1 px-3"
        >
          {showAdd ? t('settings.cancel') : '+ 添加'}
        </button>
      </div>

      <p className="text-xs text-text-secondary">
        配置 MCP (Model Context Protocol) 服务器，让 AI 能够调用外部工具。支持文件系统、数据库、API 等。
      </p>

      {(showAdd || editingId) && (
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3 border border-border">
          <div>
            <label className="block text-xs text-text-secondary mb-1">名称</label>
            <input
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如：文件系统"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">命令</label>
            <input
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              value={form.command}
              onChange={(e) => setForm({ ...form, command: e.target.value })}
              placeholder="npx / node / python"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">参数（空格分隔）</label>
            <input
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              value={form.args}
              onChange={(e) => setForm({ ...form, args: e.target.value })}
              placeholder="-y @modelcontextprotocol/server-filesystem /path"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">环境变量（每行格式 KEY=VALUE）</label>
            <textarea
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              value={form.envStr}
              onChange={(e) => setForm({ ...form, envStr: e.target.value })}
              placeholder="API_KEY=xxx"
              rows={2}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={editingId ? handleUpdate : handleAdd} className="btn-primary text-xs py-1.5 px-4 flex-1">
              {editingId ? t('settings.save') : t('settings.add')}
            </button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="btn-secondary text-xs py-1.5 px-4">
              {t('settings.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {servers.length === 0 && (
          <p className="text-text-secondary text-sm text-center py-4">暂无 MCP 服务器配置</p>
        )}
        {servers.map((srv) => (
          <div key={srv.id} className="bg-bg-secondary rounded-lg p-3 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{srv.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${srv.isEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-bg-tertiary text-text-secondary'}`}>
                  {srv.isEnabled ? '运行中' : '已停用'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(srv.id, !srv.isEnabled)}
                  className={`p-1 rounded text-xs transition-colors ${srv.isEnabled ? 'hover:bg-red-100 text-yellow-500' : 'hover:bg-green-100 text-green-500'}`}
                  title={srv.isEnabled ? '停用' : '启用'}
                >
                  {srv.isEnabled ? '⏸' : '▶'}
                </button>
                <button
                  onClick={() => startEdit(srv)}
                  className="p-1 rounded hover:bg-bg-tertiary text-text-secondary text-xs"
                  title="编辑"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(srv.id)}
                  className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-text-secondary hover:text-red-500 text-xs"
                  title="删除"
                >
                  🗑️
                </button>
              </div>
            </div>
            <p className="text-xs text-text-secondary font-mono">
              {srv.command} {srv.args.join(' ')}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-xs font-medium text-text-primary mb-2">📦 推荐安装的 MCP 服务器</h4>
        <div className="space-y-1.5">
          <div className="text-xs text-text-secondary">
            <span className="text-accent font-mono">@modelcontextprotocol/server-filesystem</span> — 文件系统访问
          </div>
          <div className="text-xs text-text-secondary">
            <span className="text-accent font-mono">@modelcontextprotocol/server-brave-search</span> — 网页搜索
          </div>
          <div className="text-xs text-text-secondary">
            <span className="text-accent font-mono">@modelcontextprotocol/server-github</span> — GitHub 操作
          </div>
        </div>
      </div>
    </div>
  );
}
