import { useState, useEffect, useCallback } from 'react';
import { useFileStore } from '@/stores/fileStore';
import type { FileNode } from '@/types/file';

export function FileTree() {
  const { workDir, setWorkDir, fileTree, setFileTree, openFile } = useFileStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    if (!workDir) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.invoke('file:list', '.') as { files: FileNode[] } | { error: string };
      if ('error' in result) setError(result.error);
      else setFileTree(result.files);
    } catch { setError('加载文件列表失败'); }
    setLoading(false);
  }, [workDir, setFileTree]);

  useEffect(() => { loadTree(); }, [loadTree]);

  const handleOpenWorkDir = async () => {
    const result = await window.electronAPI.invoke('file:openWorkDir');
    if (result && !(result as { error?: string }).error) {
      setWorkDir(result as string);
    }
  };

  const handleSetDir = async (dir: string) => {
    const result = await window.electronAPI.invoke('file:setWorkDir', dir) as { path: string } | { error: string };
    if ('error' in result) { setError(result.error); return; }
    setWorkDir(result.path);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <button onClick={handleOpenWorkDir} className="flex items-center gap-1.5 text-[12px] hover:opacity-80 transition-opacity"
          style={{ color: 'var(--accent)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
          {workDir ? (
            <span className="truncate max-w-[180px]">{workDir.split(/[/\\]/).pop() || workDir}</span>
          ) : (
            <span>选择工作目录</span>
          )}
        </button>
        <button onClick={loadTree} className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--bg-tertiary)]"
          style={{ color: 'var(--text-tertiary)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {error && <p className="text-[12px] p-3" style={{ color: 'var(--danger)' }}>{error}</p>}
        {loading && <p className="text-[12px] p-3" style={{ color: 'var(--text-tertiary)' }}>加载中...</p>}
        {!loading && !error && fileTree.length === 0 && workDir && (
          <p className="text-[12px] p-3" style={{ color: 'var(--text-tertiary)' }}>目录为空</p>
        )}
        {!workDir && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" opacity="0.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>选择工作目录以浏览文件</p>
          </div>
        )}
        {fileTree.map((node) => (
          <TreeNode key={node.path} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}

function TreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const { openFile } = useFileStore();
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState<'file' | 'dir' | null>(null);
  const [createName, setCreateName] = useState('');

  const handleClick = () => {
    if (node.type === 'directory') setExpanded(!expanded);
    else openFile(node.path);
  };

  const createItem = async () => {
    if (!createName.trim()) { setCreating(null); setCreateName(''); return; }
    const p = node.type === 'directory' ? `${node.path}/${createName.trim()}` : `${node.path.replace(/[/\\][^/\\]+$/, '')}/${createName.trim()}`;
    try {
      if (creating === 'file') await window.electronAPI.invoke('file:createFile', p, '');
      else await window.electronAPI.invoke('file:createDir', p);
    } catch {}
    setCreating(null);
    setCreateName('');
  };

  const handleDelete = async () => {
    if (!confirm(`删除 ${node.name}？`)) return;
    try { await window.electronAPI.invoke('file:delete', node.path); } catch {}
  };

  const isDir = node.type === 'directory';

  return (
    <div>
      <div className="flex items-center group text-[13px] pr-2 cursor-pointer hover:bg-[var(--bg-tertiary)]"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
        onContextMenu={(e) => { e.preventDefault(); }}>
        <span className="w-4 h-4 shrink-0 flex items-center justify-center"
          style={{ color: 'var(--text-tertiary)' }}>
          {isDir ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {expanded
                ? <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v2" /><path d="M6 14l4-4 4 4" /></>
                : <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />}
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
          )}
        </span>
        <span className="ml-1 truncate text-[13px]" style={{ color: 'var(--text-primary)' }}>{node.name}</span>
        {isDir && (
          <div className="hidden group-hover:flex items-center gap-0.5 ml-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setExpanded(true); setCreating('file'); }}
              className="w-4 h-4 rounded hover:bg-[var(--accent-bg)] flex items-center justify-center" title="新建文件"
              style={{ color: 'var(--text-tertiary)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setExpanded(true); setCreating('dir'); }}
              className="w-4 h-4 rounded hover:bg-[var(--accent-bg)] flex items-center justify-center" title="新建文件夹"
              style={{ color: 'var(--text-tertiary)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="w-4 h-4 rounded hover:bg-[var(--accent-bg)] flex items-center justify-center" title="删除"
              style={{ color: 'var(--text-tertiary)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
            </button>
          </div>
        )}
      </div>
      {creating && (
        <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}>
          <input autoFocus className="bg-[var(--bg-primary)] text-[12px] px-1 py-0.5 rounded outline-none border flex-1"
            style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createItem(); if (e.key === 'Escape') { setCreating(null); setCreateName(''); } }}
            onBlur={createItem}
            placeholder={creating === 'file' ? '新建文件...' : '新建文件夹...'} />
        </div>
      )}
      {isDir && expanded && node.children?.map((child) => (
        <TreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
