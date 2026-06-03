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
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const hasKB = files.some((f) => f.status === 'ready');

  return (
    <div className="px-4 pb-3 pt-1">
      <div className="max-w-[720px] mx-auto">
        <div className="flex items-end gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
          }}>
          <textarea ref={textareaRef}
            className="flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none py-1 max-h-[160px]"
            style={{ color: 'var(--text-primary)' }}
            placeholder={t('chat.inputPlaceholder')}
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown} rows={1} disabled={disabled} />
          <button onClick={handleSend} disabled={!input.trim() || disabled}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
            style={input.trim() && !disabled
              ? { background: 'linear-gradient(135deg, #FF403A, #FF6B6B)', color: '#fff', boxShadow: '0 2px 8px rgba(255,64,58,0.3)' }
              : { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          {hasKB && (
            <button onClick={() => setKnowledgeEnabled(!knowledgeEnabled)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all"
              style={knowledgeEnabled
                ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
                : { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              {knowledgeEnabled ? t('knowledge.knowledgeOn') : t('knowledge.knowledgeOff')}
            </button>
          )}
          {!hasKB && <div />}
          <p className="text-[11px] select-none" style={{ color: 'var(--text-muted)' }}>{t('app.hint')}</p>
        </div>
      </div>
    </div>
  );
}
