import { useState, useRef, useEffect } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { useTranslation } from 'react-i18next';

interface ModelSelectorProps {
  onOpenSettings: () => void;
}

const PROVIDER_EMOJI: Record<string, string> = {
  openai: '🤖', anthropic: '🧠', deepseek: '🔍', tongyi: '☁️', moonshot: '🌙', ollama: '🖥️', 'openai-compatible': '🔌',
};

export function ModelSelector({ onOpenSettings }: ModelSelectorProps) {
  const { models, activeModelId, setActiveModel } = useModelStore();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeModel = models.find((m) => m.id === activeModelId);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (models.length === 0) {
    return (
      <button onClick={onOpenSettings} className="btn-ghost text-xs py-1 px-2.5 rounded-lg">
        {t('settings.configureModel')}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 btn-ghost text-xs py-1 px-2.5 rounded-lg max-w-[180px]" title={activeModel?.displayName || t('chat.modelSelector')}>
        <span className="text-sm">{activeModel ? (PROVIDER_EMOJI[activeModel.provider] || '🤖') : '🤖'}</span>
        <span className="truncate">{activeModel?.displayName || t('chat.modelSelector')}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-bg-primary border border-border rounded-xl shadow-xl z-50 py-1 max-h-72 overflow-y-auto">
          {models.filter((m) => m.isEnabled).map((m) => (
            <button key={m.id} className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-secondary transition-colors ${activeModelId === m.id ? 'bg-bg-secondary' : ''}`} onClick={() => { setActiveModel(m.id); setOpen(false); }}>
              <span>{PROVIDER_EMOJI[m.provider] || '🤖'}</span>
              <span className="truncate flex-1 text-text-primary">{m.displayName}</span>
              {activeModelId === m.id && <span className="text-accent">✓</span>}
            </button>
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <button className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary transition-colors" onClick={() => { setOpen(false); onOpenSettings(); }}>
              <span>⚙️</span><span>{t('chat.manageModels')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
