import { useRef, useEffect, useState, useCallback } from 'react';
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
  const { currentConversationId, conversations, messages, isLoading, isStreaming } = useChatStore();
  const { sidebarCollapsed, toggleSidebar } = useSettingsStore();
  const { getActiveModel } = useModelStore();
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isUserScrolling = useRef(false);

  const currentConv = conversations.find((c) => c.id === currentConversationId);

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
      setShowScrollBtn(false);
    }
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const h = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      setShowScrollBtn(!atBottom);
      isUserScrolling.current = !atBottom;
    };
    el.addEventListener('scroll', h, { passive: true });
    return () => el.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    if (!isUserScrolling.current || isStreaming) scrollToBottom(isStreaming ? false : true);
  }, [messages, isStreaming, scrollToBottom]);

  const handleSend = async (content: string) => {
    if (!currentConversationId || !content.trim() || isStreaming) return;
    const active = getActiveModel();
    if (!active) { onOpenSettings(); return; }
    isUserScrolling.current = false;
    await sendMessage(currentConversationId, content.trim(), {
      provider: active.provider, model: active.modelName, apiKey: active.apiKey, baseUrl: active.baseUrl,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 h-[44px] shrink-0 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
        {sidebarCollapsed && (
          <button onClick={toggleSidebar} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        )}
        <h3 className="flex-1 min-w-0 text-[14px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {currentConv?.title || t('app.newChat')}
        </h3>
        {(isLoading || isStreaming) && (
          <div className="flex items-center gap-1">
            <span className="w-[5px] h-[5px] rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDuration: '1s', animationDelay: '0s' }} />
            <span className="w-[5px] h-[5px] rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDuration: '1s', animationDelay: '0.15s' }} />
            <span className="w-[5px] h-[5px] rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDuration: '1s', animationDelay: '0.3s' }} />
          </div>
        )}
        <ModelSelector onOpenSettings={onOpenSettings} />
      </div>

      <div className="flex-1 relative">
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto">
          <MessageList />
        </div>
        {showScrollBtn && (
          <button onClick={() => scrollToBottom(true)}
            className="absolute bottom-3 right-6 w-9 h-9 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-all z-10"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-secondary)' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>

      <ChatInput onSend={handleSend} disabled={isStreaming || isLoading} />
    </div>
  );
}
