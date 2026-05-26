import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useKnowledgeStore, KnowledgeFile } from '@/stores/knowledgeStore';
import { useModelStore } from '@/stores/modelStore';

export function KnowledgeManager() {
  const { files, setFiles, addFile, removeFile, updateFileStatus, isIndexing, setIndexing, indexingProgress } = useKnowledgeStore();
  const { getActiveModel } = useModelStore();
  const { t } = useTranslation();

  useEffect(() => {
    loadFiles();
    try {
      window.electronAPI.on('knowledge:indexProgress', (data: unknown) => {
        const progress = data as { fileId: string; status: string; progress: number; error?: string };
        if (progress.status === 'done') { setIndexing(false); updateFileStatus(progress.fileId, { status: 'ready', chunkCount: progress.progress }); }
        else if (progress.status === 'error') { setIndexing(false); updateFileStatus(progress.fileId, { status: 'error' }); }
        else { setIndexing(true, `${progress.status}... ${progress.progress} ${t('knowledge.chunks')}`); }
      });
    } catch {}
  }, []);

  const loadFiles = async () => { try { const list = await window.electronAPI.invoke('knowledge:listFiles') as KnowledgeFile[]; setFiles(list); } catch {} };

  const handleUpload = async () => {
    const activeModel = getActiveModel();
    if (!activeModel) { alert(t('error.noModel')); return; }
    let filePath: string | null = null;
    try { filePath = await window.electronAPI.invoke('dialog:openFile', { filters: [{ name: t('knowledge.title'), extensions: ['pdf', 'docx', 'txt', 'md', 'py', 'ts', 'js', 'json', 'csv', 'yaml', 'yml', 'xml', 'html', 'css', 'log'] }] }) as string | null; } catch { const input = document.createElement('input'); input.type = 'file'; input.accept = '.pdf,.docx,.txt,.md,.py,.ts,.js,.json,.csv'; filePath = await new Promise((resolve) => { input.onchange = () => resolve(input.files?.[0]?.name || null); input.click(); }); }
    if (!filePath) return;
    const fileName = filePath.split(/[/\\]/).pop() || 'unknown';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    addFile({ id: `pending-${Date.now()}`, fileName, filePath, fileType: ext === 'pdf' ? 'application/pdf' : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/plain', fileSize: 0, chunkCount: 0, status: 'processing', createdAt: Date.now() });
    setIndexing(true, t('knowledge.parsing'));
    try { const result = await window.electronAPI.invoke('knowledge:indexFile', { filePath, fileName, fileType: 'text/plain', fileSize: 0, apiKey: activeModel.apiKey, baseUrl: activeModel.baseUrl }) as { success: boolean; fileId?: string; error?: string }; if (result.success) loadFiles(); else { setIndexing(false); alert(`${t('knowledge.indexFailed')}: ${result.error}`); } } catch { setIndexing(false); alert(t('knowledge.indexFailed')); }
  };

  const handleDelete = async (id: string) => { try { await window.electronAPI.invoke('knowledge:removeFile', id); } catch {} removeFile(id); };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{t('knowledge.title')}</h3>
        <button onClick={handleUpload} disabled={isIndexing} className="btn-secondary text-xs py-1 px-3">{isIndexing ? indexingProgress || t('knowledge.indexing') : t('knowledge.upload')}</button>
      </div>
      <p className="text-xs text-text-secondary opacity-70">{t('knowledge.description')}</p>
      <div className="space-y-2">
        {files.length === 0 && !isIndexing && <p className="text-text-secondary text-sm text-center py-4">{t('knowledge.noFiles')}</p>}
        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-2 bg-bg-secondary rounded-lg p-2.5 border border-border">
            <span className="text-base flex-shrink-0">{file.status === 'ready' ? '📄' : file.status === 'error' ? '❌' : '⏳'}</span>
            <div className="flex-1 min-w-0"><div className="text-sm text-text-primary truncate">{file.fileName}</div><div className="text-[11px] text-text-secondary">{file.status === 'ready' ? `${file.chunkCount} ${t('knowledge.chunks')}` : file.status === 'error' ? t('knowledge.indexFailed') : t('knowledge.indexing')}</div></div>
            <button onClick={() => handleDelete(file.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-text-secondary hover:text-red-500 text-xs flex-shrink-0">🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}
