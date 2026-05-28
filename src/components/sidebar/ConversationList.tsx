import { useState, useRef, useEffect } from 'react';
import type { Conversation } from '@/types';
import { useChatStore } from '@/stores/chatStore';
import { useTranslation } from 'react-i18next';

interface ConversationListProps {
  conversations: Conversation[];
  currentId: string | null;
}

export function ConversationList({ conversations, currentId }: ConversationListProps) {
  const { setCurrentConversation, setMessages, updateConversation, removeConversation } =
    useChatStore();
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
      editInputRef.current.scrollLeft = 0;
    }
  }, [editingId]);

  const handleSelect = async (id: string) => {
    if (editingId) return;
    setCurrentConversation(id);
    try {
      const msgs = (await window.electronAPI.invoke('message:list', id)) as unknown[];
      setMessages(msgs as Parameters<typeof setMessages>[0]);
    } catch {
      setMessages([]);
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      await window.electronAPI.invoke('conversation:delete', id);
    } catch {}
    removeConversation(id);
    setDeleteConfirm(null);
  };

  const startRename = (e: React.MouseEvent | React.KeyboardEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const finishRename = async () => {
    const id = editingId;
    const title = editTitle.trim();
    setEditingId(null);
    setEditTitle('');
    if (!id || !title) return;
    try {
      await window.electronAPI.invoke('conversation:update', id, { title });
    } catch {}
    updateConversation(id, { title });
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishRename();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);
      setEditTitle('');
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-text-secondary text-sm text-center">{t('sidebar.noConversations')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={`sidebar-item group ${currentId === conv.id ? 'active' : ''}`}
          onClick={() => handleSelect(conv.id)}
          role="button"
          tabIndex={0}
          aria-selected={currentId === conv.id}
          onKeyDown={(e) => e.key === 'Enter' && handleSelect(conv.id)}
        >
          <span className="text-base flex-shrink-0">💬</span>
          {editingId === conv.id ? (
            <input
              ref={editInputRef}
              className="flex-1 min-w-0 bg-bg-primary text-text-primary text-sm px-1.5 py-0.5 rounded border border-accent outline-none"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={finishRename}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 truncate text-sm">{conv.title}</span>
          )}
          {editingId !== conv.id && (
            <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-1 rounded hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors"
                onClick={(e) => startRename(e, conv.id, conv.title)}
                onMouseDown={(e) => e.stopPropagation()}
                title={t('chat.rename')}
                aria-label={t('chat.rename')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-text-secondary hover:text-red-500 transition-colors"
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(conv.id); }}
                onMouseDown={(e) => e.stopPropagation()}
                title={t('chat.delete')}
                aria-label={t('chat.delete')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          )}
        </div>
      ))}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-bg-primary rounded-xl p-5 shadow-xl max-w-sm w-full mx-4 border border-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-text-primary font-medium mb-1">{t('confirm.deleteConversation')}</h3>
            <p className="text-text-secondary text-sm mb-4">{t('confirm.deleteConversationDesc')}</p>
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost text-sm px-4 py-1.5" onClick={() => setDeleteConfirm(null)}>{t('confirm.cancel')}</button>
              <button className="btn-primary text-sm px-4 py-1.5 !bg-red-500 hover:!bg-red-600" onClick={() => handleDeleteConfirm(deleteConfirm)}>{t('confirm.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
