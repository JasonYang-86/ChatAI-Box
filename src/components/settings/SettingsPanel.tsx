import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ModelConfigPanel } from './ModelConfigPanel';
import { CharacterPanel } from './CharacterPanel';
import { KnowledgeManager } from '@/components/knowledge/KnowledgeManager';
import { MCPSettings } from './MCPSettings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<'models' | 'characters' | 'knowledge' | 'mcp'>('models');
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs = [
    { key: 'models' as const, label: t('settings.models') },
    { key: 'characters' as const, label: t('settings.characters') },
    { key: 'knowledge' as const, label: t('settings.knowledge') },
    { key: 'mcp' as const, label: 'MCP' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-[420px] h-full bg-bg-primary border-l border-border shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-bg-primary z-10 border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-base font-semibold text-text-primary">{t('settings.title')}</h2>
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg" aria-label={t('settings.cancel')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex px-4 gap-4 overflow-x-auto">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                className={`py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${
                  tab === key ? 'border-accent text-accent font-medium' : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setTab(key)}
                role="tab"
                aria-selected={tab === key}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'models' && <ModelConfigPanel />}
        {tab === 'characters' && <CharacterPanel />}
        {tab === 'knowledge' && <KnowledgeManager />}
        {tab === 'mcp' && <MCPSettings />}
      </div>
    </div>
  );
}
