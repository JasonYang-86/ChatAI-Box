import type { Message } from '@/types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageItem({ message, isStreaming = false }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2.5 animate-fade-in-up ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-[30px] h-[30px] shrink-0 rounded-xl flex items-center justify-center text-[11px] font-bold select-none mt-0.5"
          style={{ background: 'linear-gradient(135deg, #FF403A, #FF6B6B)', color: '#fff' }}>
          AI
        </div>
      )}
      <div className={isUser ? 'bubble-user' : 'bubble-ai'}>
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        ) : (
          <div>
            <MarkdownRenderer content={message.content} />
            {isStreaming && (
              <span className="inline-block w-[2px] h-[18px] align-text-bottom ml-0.5"
                style={{ background: 'var(--accent)', animation: 'blink 0.8s ease-in-out infinite' }} />
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-[30px] h-[30px] shrink-0 rounded-xl flex items-center justify-center text-[11px] font-bold select-none mt-0.5"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          U
        </div>
      )}
    </div>
  );
}
