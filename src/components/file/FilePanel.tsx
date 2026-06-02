import { useState } from 'react';
import { FileTree } from './FileTree';
import { FileEditor } from './FileEditor';
import { ChangeTracker } from './ChangeTracker';
import { useFileStore } from '@/stores/fileStore';

export function FilePanel() {
  const { workDir, isPanelOpen, togglePanel, openFiles, activeFile, closeFile, setActiveFile } = useFileStore();
  const [tab, setTab] = useState<'files' | 'editor' | 'changes'>('files');

  if (!isPanelOpen && !workDir) return null;

  return (
    <div className="flex flex-col h-full border-l" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
      <div className="flex items-center justify-between h-9 px-3 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-1">
          <button onClick={() => setTab('files')} className={`text-[12px] px-2 py-0.5 rounded ${tab === 'files' ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
            文件
          </button>
          {activeFile && (
            <button onClick={() => setTab('editor')} className={`text-[12px] px-2 py-0.5 rounded ${tab === 'editor' ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
              编辑器
            </button>
          )}
          <button onClick={() => setTab('changes')} className={`text-[12px] px-2 py-0.5 rounded ${tab === 'changes' ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
            变更
          </button>
        </div>
        <button onClick={togglePanel} className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--bg-tertiary)]"
          style={{ color: 'var(--text-tertiary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {openFiles.length > 0 && (
        <div className="flex overflow-x-auto shrink-0 border-b" style={{ borderColor: 'var(--border-color)' }}>
          {openFiles.map((f) => {
            const name = f.split(/[/\\]/).pop() || f;
            return (
              <div key={f} onClick={() => { setActiveFile(f); setTab('editor'); }}
                className={`flex items-center gap-1 px-3 py-1.5 text-[12px] cursor-pointer border-r whitespace-nowrap ${activeFile === f ? 'bg-[var(--bg-primary)] border-b-2' : ''}`}
                style={{ borderColor: 'var(--border-color)', borderBottomColor: activeFile === f ? 'var(--accent)' : 'transparent', color: activeFile === f ? 'var(--accent)' : 'var(--text-secondary)' }}>
                <span className="truncate max-w-[120px]">{name}</span>
                <button onClick={(e) => { e.stopPropagation(); closeFile(f); }}
                  className="ml-0.5 hover:text-[var(--danger)] rounded" style={{ color: 'var(--text-tertiary)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {tab === 'files' && <FileTree />}
        {tab === 'editor' && activeFile && <FileEditor />}
        {tab === 'changes' && <ChangeTracker />}
      </div>
    </div>
  );
}
