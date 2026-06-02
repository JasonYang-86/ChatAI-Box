import { useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useFileStore } from '@/stores/fileStore';

export function FileEditor() {
  const { activeFile, fileContents, updateFileContent } = useFileStore();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(async (path: string) => {
    if (fileContents[path] !== undefined) {
      setContent(fileContents[path]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.invoke('file:read', path) as { content: string } | { error: string };
      if ('error' in result) { setError(result.error); }
      else {
        setContent(result.content);
        updateFileContent(path, result.content);
      }
    } catch { setError('读取文件失败'); }
    setLoading(false);
  }, [fileContents, updateFileContent]);

  useEffect(() => {
    if (activeFile) loadFile(activeFile);
  }, [activeFile, loadFile]);

  const handleSave = async () => {
    if (!activeFile) return;
    try {
      await window.electronAPI.invoke('file:write', activeFile, content);
      updateFileContent(activeFile, content);
    } catch {}
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
  }, [activeFile, content]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!activeFile) {
    return (
      <div className="flex items-center justify-center h-full text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
        选择文件以编辑
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>
      </div>
    );
  }

  const ext = activeFile.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', cpp: 'cpp', c: 'c',
    html: 'html', css: 'css', scss: 'scss', less: 'less',
    json: 'json', md: 'markdown', yml: 'yaml', yaml: 'yaml',
    xml: 'xml', sql: 'sql', sh: 'shell', bat: 'bat', ps1: 'powershell',
    vue: 'html', svelte: 'html', rb: 'ruby', php: 'php',
    swift: 'swift', kt: 'kotlin', scala: 'scala', lua: 'lua', r: 'r'
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1 shrink-0 border-b text-[11px]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>
        <span>{activeFile}</span>
        <button onClick={handleSave} className="hover:text-[var(--accent)] transition-colors" title="Ctrl+S 保存">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17,21 17,13 7,13 7,21" /><polyline points="7,3 7,8 15,8" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={ext ? langMap[ext] || 'plaintext' : 'plaintext'}
          value={content}
          onChange={(val) => setContent(val || '')}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 8 },
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            contextmenu: true,
            bracketPairColorization: { enabled: true },
            guides: { indentation: true },
          }}
          loading={
            <div className="flex items-center justify-center h-full text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              加载编辑器...
            </div>
          }
        />
      </div>
    </div>
  );
}
