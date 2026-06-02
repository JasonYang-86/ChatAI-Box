import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { ExportDialog } from '@/components/chat/ExportDialog';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useSettingsStore } from '@/stores/settingsStore';
import { useChatStore } from '@/stores/chatStore';
import { useModelStore } from '@/stores/modelStore';
import type { Conversation } from '@/types';
import type { ModelConfig, ProviderInfo } from '@/types/model';

export default function App() {
  const { theme, sidebarCollapsed, sidebarWidth, toggleSidebar, toggleTheme } =
    useSettingsStore();
  const { currentConversationId, conversations, messages } = useChatStore();
  const { setProviders, setModels, setActiveModel, getActiveModel } = useModelStore();
  const { t, i18n } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (exportOpen) setExportOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen, exportOpen]);

  const initData = async () => {
    try {
      const providerList = (await window.electronAPI.invoke('chat:getProviders')) as ProviderInfo[];
      setProviders(providerList);

      const dbModels = (await window.electronAPI.invoke('model:list')) as ModelConfig[];
      if (Array.isArray(dbModels)) {
        setModels(dbModels);
        const savedId = localStorage.getItem('chatai-active-model');
        if (savedId && dbModels.find((m) => m.id === savedId)) setActiveModel(savedId);
        else if (dbModels.length > 0) setActiveModel(dbModels[0].id);
      }

      const convList = (await window.electronAPI.invoke('conversation:list')) as Conversation[];
      if (Array.isArray(convList) && convList.length > 0) {
        useChatStore.getState().setConversations(convList);
      }
    } catch {}
  };

  const toggleLanguage = useCallback(() => {
    const next = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
    i18n.changeLanguage(next);
    localStorage.setItem('chatai-language', next);
  }, [i18n]);

  const handleNewChat = useCallback(async () => {
    try {
      const conv = (await window.electronAPI.invoke('conversation:create')) as Conversation;
      useChatStore.getState().addConversation(conv);
    } catch {
      useChatStore.getState().addConversation({
        id: Date.now().toString(),
        title: t('app.newChat'),
        modelId: 'default',
        systemPrompt: null,
        characterId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPinned: 0,
        isArchived: 0,
      } as Conversation);
    }
  }, [t]);

  useShortcuts({
    onNewChat: handleNewChat,
    onToggleSidebar: toggleSidebar,
    onToggleTheme: toggleTheme,
    onToggleSettings: () => setSettingsOpen((v) => !v),
    onExport: () => setExportOpen(true),
  });

  const currentConv = conversations.find((c) => c.id === currentConversationId);
  const hasModel = !!getActiveModel();

  return (
    <div className="flex h-full bg-bg-primary">
      <Sidebar
        onOpenSettings={() => setSettingsOpen(true)}
        onNewChat={handleNewChat}
        onToggleLanguage={toggleLanguage}
      />
      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarCollapsed ? 0 : sidebarWidth }}
      >
        {currentConversationId ? (
          <ChatContainer onOpenSettings={() => setSettingsOpen(true)} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center animate-fade-in-up max-w-lg">
              <div className="relative inline-flex mb-6">
                <div className="w-20 h-20 rounded-2xl bg-accent-soft flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-bg-primary flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">{t('app.name')}</h1>
              <p className="text-text-secondary mb-8 text-sm">{t('app.welcome')}</p>

              <div className="flex items-center justify-center gap-3 mb-10">
                <button onClick={handleNewChat} className="btn-primary text-sm px-6 py-2.5 rounded-xl">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t('app.newChat')}
                </button>
                {!hasModel && (
                  <button onClick={() => setSettingsOpen(true)} className="btn-secondary text-sm px-6 py-2.5 rounded-xl">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                    </svg>
                    {t('model.goSettings')}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <div className="card p-3 text-left">
                  <div className="text-lg mb-1">🔌</div>
                  <div className="text-xs font-medium text-text-primary">{i18n.language === 'zh-CN' ? '多模型支持' : 'Multi-Model'}</div>
                  <div className="text-xs text-text-muted mt-0.5">{i18n.language === 'zh-CN' ? 'OpenAI · Claude · DeepSeek 等 7 种' : 'OpenAI · Claude · DeepSeek & more'}</div>
                </div>
                <div className="card p-3 text-left">
                  <div className="text-lg mb-1">📚</div>
                  <div className="text-xs font-medium text-text-primary">{i18n.language === 'zh-CN' ? '知识库 RAG' : 'RAG Knowledge'}</div>
                  <div className="text-xs text-text-muted mt-0.5">{i18n.language === 'zh-CN' ? '本地文件智能问答' : 'Local file smart Q&A'}</div>
                </div>
                <div className="card p-3 text-left">
                  <div className="text-lg mb-1">🔒</div>
                  <div className="text-xs font-medium text-text-primary">{i18n.language === 'zh-CN' ? '本地存储' : 'Local Storage'}</div>
                  <div className="text-xs text-text-muted mt-0.5">{i18n.language === 'zh-CN' ? '数据完全本地 · 隐私安全' : 'Fully local · Private & Secure'}</div>
                </div>
                <div className="card p-3 text-left">
                  <div className="text-lg mb-1">🛠️</div>
                  <div className="text-xs font-medium text-text-primary">MCP 工具</div>
                  <div className="text-xs text-text-muted mt-0.5">{i18n.language === 'zh-CN' ? 'AI 可调用外部工具' : 'AI calls external tools'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ExportDialog
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        messages={messages}
        title={currentConv?.title || 'ChatAI'}
      />

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
