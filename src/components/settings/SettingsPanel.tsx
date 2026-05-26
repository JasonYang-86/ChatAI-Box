import { useState } from 'react';
import { ModelConfigPanel } from './ModelConfigPanel';
import { CharacterPanel } from './CharacterPanel';
import { KnowledgeManager } from '@/components/knowledge/KnowledgeManager';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<'models' | 'characters' | 'knowledge'>('models');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-[420px] h-full bg-bg-primary border-l border-border shadow-2xl overflow-y-auto animate-slide-in">
        <div className="sticky top-0 bg-bg-primary z-10 border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-base font-semibold text-text-primary">设置</h2>
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex px-4 gap-4 overflow-x-auto">
            <button
              className={`py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${
                tab === 'models' ? 'border-accent text-accent' : 'border-transparent text-text-secondary'
              }`}
              onClick={() => setTab('models')}
            >
              模型
            </button>
            <button
              className={`py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${
                tab === 'characters' ? 'border-accent text-accent' : 'border-transparent text-text-secondary'
              }`}
              onClick={() => setTab('characters')}
            >
              AI 角色
            </button>
            <button
              className={`py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${
                tab === 'knowledge' ? 'border-accent text-accent' : 'border-transparent text-text-secondary'
              }`}
              onClick={() => setTab('knowledge')}
            >
              知识库
            </button>
          </div>
        </div>

        {tab === 'models' && <ModelConfigPanel />}
        {tab === 'characters' && <CharacterPanel />}
        {tab === 'knowledge' && <KnowledgeManager />}
      </div>
    </div>
  );
}
