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

  const handleSelect = async (id: string) => {
    setCurrentConversation(id);
    try {
      const msgs = (await window.electronAPI.invoke('message:list', id)) as unknown[];
      setMessages(msgs as Parameters<typeof setMessages>[0]);
    } catch {
      setMessages([]);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await window.electronAPI.invoke('conversation:delete', id);
    } catch {}
    removeConversation(id);
  };

  const handleRename = async (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    const newTitle = prompt(t('chat.renamePrompt'), currentTitle);
    if (!newTitle || !newTitle.trim()) return;
    try {
      await window.electronAPI.invoke('conversation:update', id, { title: newTitle.trim() });
    } catch {}
    updateConversation(id, { title: newTitle.trim() });
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
        >
          <span className="text-base flex-shrink-0">💬</span>
          <span className="flex-1 truncate text-sm">{conv.title}</span>
          <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1 rounded hover:bg-bg-primary text-text-secondary" onClick={(e) => handleRename(e, conv.id, conv.title)} title={t('chat.rename')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-text-secondary hover:text-red-500" onClick={(e) => handleDelete(e, conv.id)} title={t('chat.delete')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
