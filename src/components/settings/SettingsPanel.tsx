import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ModelConfigPanel } from './ModelConfigPanel';
import { CharacterPanel } from './CharacterPanel';
import { KnowledgeManager } from '@/components/knowledge/KnowledgeManager';
import { MCPSettings } from './MCPSettings';
import { MemoryPanel } from '@/components/memory/MemoryPanel';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<'models' | 'characters' | 'knowledge' | 'mcp' | 'memory'>('models');
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs = [
    { key: 'models' as const, label: t('settings.models') },
    { key: 'characters' as const, label: t('settings.characters') },
    { key: 'knowledge' as const, label: t('settings.knowledge') },
    { key: 'mcp' as const, label: t('settings.mcp') },
    { key: 'memory' as const, label: t('settings.memory') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-[420px] h-full overflow-y-auto animate-slide-in-right"
        style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)' }}>
        <div className="sticky top-0 z-10 border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-5 py-3.5">
            <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>设置</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)]"
              style={{ color: 'var(--text-secondary)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex px-5 gap-6" role="tablist">
            {tabs.map(({ key, label }) => (
              <button key={key} role="tab" aria-selected={tab === key}
                className="relative pb-3 text-[13px] font-medium transition-colors whitespace-nowrap"
                style={{ color: tab === key ? 'var(--accent)' : 'var(--text-muted)' }}
                onClick={() => setTab(key)}>
                {label}
                {tab === key && <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: 'var(--accent)' }} />}
              </button>
            ))}
          </div>
        </div>
        {tab === 'models' && <ModelConfigPanel />}
        {tab === 'characters' && <CharacterPanel />}
        {tab === 'knowledge' && <KnowledgeManager />}
        {tab === 'mcp' && <MCPSettings />}
        {tab === 'memory' && <MemoryPanel />}
      </div>
    </div>
  );
}
