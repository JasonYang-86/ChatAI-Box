import { useState, useEffect, useCallback } from 'react';

interface MemorySummary {
  id: string;
  conversationId: string;
  timestamp: number;
  topic: string;
  tags: string[];
  messageCount: number;
}

interface MemoryStats {
  totalConversations: number;
  totalMessages: number;
  lastUpdated: number;
}

export function MemoryPanel() {
  const [memories, setMemories] = useState<MemorySummary[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemorySummary[] | null>(null);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([
        window.electronAPI.invoke('memory:list', 100) as Promise<MemorySummary[]>,
        window.electronAPI.invoke('memory:stats') as Promise<MemoryStats>,
      ]);
      if (Array.isArray(list)) setMemories(list);
      if (s) setStats(s);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setLoading(true);
    try {
      const results = await window.electronAPI.invoke('memory:search', {
        query: searchQuery,
        topK: 10,
        minScore: 0.1,
      }) as MemorySummary[];
      if (Array.isArray(results)) setSearchResults(results);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await window.electronAPI.invoke('memory:delete', id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      setMessage('已删除');
      setTimeout(() => setMessage(''), 2000);
      loadData();
    } catch {}
  };

  const handleRebuild = async () => {
    setLoading(true);
    try {
      await window.electronAPI.invoke('memory:rebuild');
      setMessage('嵌入向量已重建');
      setTimeout(() => setMessage(''), 2000);
      loadData();
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('确定要清空所有记忆吗？此操作不可撤销。')) return;
    try {
      await window.electronAPI.invoke('memory:clear');
      setMemories([]);
      setStats(null);
      setMessage('已清空全部记忆');
      setTimeout(() => setMessage(''), 2000);
    } catch {}
  };

  const displayList = searchResults ?? memories;

  return (
    <div className="p-4 space-y-4">
      {/* 统计卡片 */}
      {stats && (
        <div className="flex gap-3">
          <div className="flex-1 p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              记忆对话
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
              {stats.totalConversations}
            </div>
          </div>
          <div className="flex-1 p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              记忆消息
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
              {stats.totalMessages}
            </div>
          </div>
        </div>
      )}

      {/* 搜索栏 */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="搜索记忆..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-3 py-2 rounded-lg text-[13px] border outline-none transition-colors"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
          style={{
            background: 'var(--accent)',
            color: '#fff',
          }}
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
        {searchResults && (
          <button
            onClick={() => { setSearchResults(null); setSearchQuery(''); }}
            className="px-3 py-2 rounded-lg text-[13px]"
            style={{ color: 'var(--text-muted)' }}
          >
            清除
          </button>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleRebuild}
          disabled={loading || memories.length === 0}
          className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-all"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            opacity: (loading || memories.length === 0) ? 0.5 : 1,
          }}
        >
          重建索引
        </button>
        <button
          onClick={handleClear}
          disabled={memories.length === 0}
          className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-all"
          style={{
            background: 'rgba(255, 64, 58, 0.1)',
            color: 'var(--accent)',
            opacity: memories.length === 0 ? 0.5 : 1,
          }}
        >
          清空记忆
        </button>
      </div>

      {/* 提示信息 */}
      {message && (
        <div className="text-center text-[13px] py-2 rounded-lg"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          {message}
        </div>
      )}

      {/* 记忆列表 */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {displayList.length === 0 && (
          <div className="text-center text-[13px] py-8" style={{ color: 'var(--text-muted)' }}>
            {searchResults ? '未找到匹配的记忆' : '暂无记忆。开始对话后会自动保存。'}
          </div>
        )}
        {displayList.map((mem) => (
          <div
            key={mem.id}
            className="p-3 rounded-xl border transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {mem.topic}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    {new Date(mem.timestamp).toLocaleString('zh-CN')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {mem.messageCount} 条消息
                  </span>
                </div>
                {mem.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {mem.tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[10px]"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(mem.id)}
                className="ml-2 p-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors shrink-0"
                style={{ color: 'var(--text-muted)' }}
                title="删除"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
