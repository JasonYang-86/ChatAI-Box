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
import type { Conversation, Message } from '@/types';
import type { ModelConfig, ProviderInfo } from '@/types/model';

export default function App() {
  const { theme, sidebarCollapsed, sidebarWidth, toggleSidebar, toggleTheme } =
    useSettingsStore();
  const { currentConversationId, conversations, messages } = useChatStore();
  const { setProviders, setModels, setActiveModel } = useModelStore();
  const { t, i18n } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      const providerList = (await window.electronAPI.invoke(
        'chat:getProviders',
      )) as ProviderInfo[];
      setProviders(providerList);

      const dbModels = (await window.electronAPI.invoke('model:list')) as ModelConfig[];
      if (Array.isArray(dbModels)) {
        setModels(dbModels);
        const savedId = localStorage.getItem('chatai-active-model');
        if (savedId && dbModels.find((m) => m.id === savedId)) {
          setActiveModel(savedId);
        } else if (dbModels.length > 0) {
          setActiveModel(dbModels[0].id);
        }
      }

      const convList = (await window.electronAPI.invoke('conversation:list')) as Conversation[];
      if (Array.isArray(convList) && convList.length > 0) {
        useChatStore.getState().setConversations(convList);
      }
    } catch {
      // browser mode
    }
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

  return (
    <div className="flex h-full bg-bg-primary">
      <Sidebar
        onOpenSettings={() => setSettingsOpen(true)}
        onNewChat={handleNewChat}
        onToggleLanguage={toggleLanguage}
      />
      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-250"
        style={{ marginLeft: sidebarCollapsed ? 0 : sidebarWidth }}
      >
        {currentConversationId ? (
          <ChatContainer onOpenSettings={() => setSettingsOpen(true)} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <div className="text-6xl mb-4">💬</div>
              <h1 className="text-2xl font-semibold text-text-primary mb-2">{t('app.name')}</h1>
              <p className="text-text-secondary">{t('app.welcome')}</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button onClick={handleNewChat} className="btn-primary text-sm">
                  {t('app.newChat')}
                </button>
                <button onClick={toggleLanguage} className="btn-ghost text-sm">
                  {i18n.language === 'zh-CN' ? 'English' : '中文'}
                </button>
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
