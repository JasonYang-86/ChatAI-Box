import type { Message } from '@/types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageItem({ message, isStreaming = false }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-message-in`}>
      <div className={isUser ? 'bubble-user' : 'bubble-ai'}>
        {isUser ? (
          <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
        ) : (
          <div>
            <MarkdownRenderer content={message.content} />
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle animate-pulse opacity-50" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
