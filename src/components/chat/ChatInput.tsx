import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useKnowledgeStore } from '@/stores/knowledgeStore';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { knowledgeEnabled, setKnowledgeEnabled, files } = useKnowledgeStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasKnowledgeFiles = files.some((f) => f.status === 'ready');

  return (
    <div className="border-t border-border bg-bg-primary px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-bg-secondary rounded-2xl px-4 py-2 border border-border focus-within:border-accent transition-all duration-200 focus-within:shadow-sm">
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent text-text-primary text-[15px] leading-relaxed outline-none placeholder:text-text-secondary py-1.5 max-h-[200px]"
            placeholder={t('chat.inputPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
            aria-label={t('chat.inputPlaceholder')}
          />
          <button
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 ${
              input.trim() && !disabled
                ? 'bg-accent text-white hover:bg-accent-hover hover:scale-105 active:scale-95'
                : 'bg-bg-tertiary text-text-secondary cursor-not-allowed'
            }`}
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            aria-label={t('chat.send')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {hasKnowledgeFiles && (
              <button
                onClick={() => setKnowledgeEnabled(!knowledgeEnabled)}
                className={`text-xs px-2 py-0.5 rounded-md transition-all duration-200 ${
                  knowledgeEnabled
                    ? 'bg-accent/10 text-accent border border-accent/30'
                    : 'bg-bg-tertiary text-text-secondary border border-border hover:border-text-secondary'
                }`}
                title={knowledgeEnabled ? t('knowledge.knowledgeOnHint') : t('knowledge.knowledgeOffHint')}
                aria-label={knowledgeEnabled ? t('knowledge.knowledgeOff') : t('knowledge.knowledgeOn')}
              >
                <span className="mr-1">📚</span>
                {knowledgeEnabled ? t('knowledge.knowledgeOn') : t('knowledge.knowledgeOff')}
              </button>
            )}
          </div>
          <p className="text-text-secondary text-[11px] opacity-50 select-none">
            {t('app.hint')}
          </p>
        </div>
      </div>
    </div>
  );
}
