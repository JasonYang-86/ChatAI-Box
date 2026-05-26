import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useModelStore } from '@/stores/modelStore';
import { sendMessage } from '@/services/chat';

interface ChatContainerProps {
  onOpenSettings: () => void;
}

export function ChatContainer({ onOpenSettings }: ChatContainerProps) {
  const { currentConversationId, conversations, messages, isLoading, isStreaming } =
    useChatStore();
  const { sidebarCollapsed, toggleSidebar } = useSettingsStore();
  const { getActiveModel } = useModelStore();
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentConv = conversations.find((c) => c.id === currentConversationId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleSend = async (content: string) => {
    if (!currentConversationId || !content.trim() || isStreaming) return;
    const activeModel = getActiveModel();
    if (!activeModel) {
      onOpenSettings();
      return;
    }
    await sendMessage(currentConversationId, content.trim(), {
      provider: activeModel.provider,
      model: activeModel.modelName,
      apiKey: activeModel.apiKey,
      baseUrl: activeModel.baseUrl,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-bg-primary">
        {sidebarCollapsed && (
          <button onClick={toggleSidebar} className="btn-ghost p-1.5 rounded-lg" title={t('sidebar.expand')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-text-primary truncate">{currentConv?.title || t('app.newChat')}</h3>
        </div>
        <ModelSelector onOpenSettings={onOpenSettings} />
        {(isLoading || isStreaming) && (
          <div className="flex items-center gap-1.5 text-text-secondary text-xs">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-dot-bounce" style={{ animationDelay: '0s' }} />
              <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-dot-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-dot-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
            {isStreaming ? t('chat.replying') : t('chat.thinking')}
          </div>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <MessageList />
      </div>
      <ChatInput onSend={handleSend} disabled={isStreaming || isLoading} />
    </div>
  );
}
