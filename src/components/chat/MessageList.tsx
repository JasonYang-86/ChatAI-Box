import { useTranslation } from 'react-i18next';
import { useChatStore } from '@/stores/chatStore';
import { MessageItem } from './MessageItem';

export function MessageList() {
  const { messages, isStreaming, streamingMessageId } = useChatStore();
  const { t } = useTranslation();

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-text-secondary text-sm">{t('app.startChat')}</p>
          <p className="text-text-secondary text-xs mt-1 opacity-60">{t('shortcuts.sendMessage')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} isStreaming={isStreaming && msg.id === streamingMessageId} />
      ))}
    </div>
  );
}
