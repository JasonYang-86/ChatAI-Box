import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { ExportDialog } from '@/components/chat/ExportDialog';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { FilePanel } from '@/components/file/FilePanel';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useSettingsStore } from '@/stores/settingsStore';
import { useChatStore } from '@/stores/chatStore';
import { useModelStore } from '@/stores/modelStore';
import { useFileStore } from '@/stores/fileStore';
import type { Conversation } from '@/types';
import type { ModelConfig, ProviderInfo } from '@/types/model';

export default function App() {
  const { theme, sidebarCollapsed, sidebarWidth, toggleSidebar, toggleTheme } = useSettingsStore();
  const { currentConversationId, conversations, messages } = useChatStore();
  const { setProviders, setModels, setActiveModel, getActiveModel } = useModelStore();
  const { isPanelOpen, togglePanel, setPanelOpen } = useFileStore();
  const { t, i18n } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => { initData(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (exportOpen) setExportOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
        else if (isPanelOpen) setPanelOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, exportOpen, isPanelOpen]);

  const initData = async () => {
    try {
      const providerList = await window.electronAPI.invoke('chat:getProviders') as ProviderInfo[];
      setProviders(providerList);
      const dbModels = await window.electronAPI.invoke('model:list') as ModelConfig[];
      if (Array.isArray(dbModels)) {
        setModels(dbModels);
        const id = localStorage.getItem('chatai-active-model');
        if (id && dbModels.find((m) => m.id === id)) setActiveModel(id);
        else if (dbModels.length > 0) setActiveModel(dbModels[0].id);
      }
      const list = await window.electronAPI.invoke('conversation:list') as Conversation[];
      if (Array.isArray(list) && list.length > 0) useChatStore.getState().setConversations(list);
    } catch {}
  };

  const toggleLang = useCallback(() => {
    const next = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
    i18n.changeLanguage(next);
    localStorage.setItem('chatai-language', next);
  }, [i18n]);

  const newChat = useCallback(async () => {
    try {
      const c = await window.electronAPI.invoke('conversation:create') as Conversation;
      useChatStore.getState().addConversation(c);
    } catch {
      useChatStore.getState().addConversation({
        id: Date.now().toString(), title: t('app.newChat'), modelId: 'default',
        systemPrompt: null, characterId: null, createdAt: Date.now(), updatedAt: Date.now(),
        isPinned: 0, isArchived: 0,
      } as Conversation);
    }
  }, [t]);

  useShortcuts({ onNewChat: newChat, onToggleSidebar: toggleSidebar, onToggleTheme: toggleTheme,
    onToggleSettings: () => setSettingsOpen((v) => !v), onExport: () => setExportOpen(true) });

  const currentConv = conversations.find((c) => c.id === currentConversationId);
  const hasModel = !!getActiveModel();

  return (
    <div className="flex h-full" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} onNewChat={newChat} onToggleLanguage={toggleLang} />

      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 0 : sidebarWidth, marginRight: isPanelOpen ? 300 : 0 }}
      >
        <div className="flex items-center justify-end px-4 py-1 shrink-0">
          <button onClick={togglePanel}
            className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: isPanelOpen ? 'var(--accent)' : 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
            文件
          </button>
        </div>

        {currentConversationId ? (
          <ChatContainer onOpenSettings={() => setSettingsOpen(true)} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center animate-fade-in-up max-w-md">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
                style={{
                  background: 'linear-gradient(135deg, #FF403A, #FF6B6B)',
                  boxShadow: '0 8px 32px rgba(255, 64, 58, 0.25)',
                }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>

              <h1 className="text-[28px] font-bold mb-3 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                ChatAI
              </h1>
              <p className="text-[15px] mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {t('app.welcome')}
              </p>

              <div className="flex items-center justify-center gap-3 mb-12">
                <button onClick={newChat} className="px-8 py-3 rounded-xl text-white font-medium text-[15px] transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #FF403A, #FF6B6B)',
                    boxShadow: '0 4px 16px rgba(255, 64, 58, 0.3)',
                  }}>
                  开始对话
                </button>
                {!hasModel && (
                  <button onClick={() => setSettingsOpen(true)} className="btn-secondary px-6 py-3 text-[15px]">
                    配置模型
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center gap-4 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={toggleLang} className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                  {i18n.language === 'zh-CN' ? 'English' : '中文'}
                </button>
                <span className="w-1 h-1 rounded-full" style={{ background: 'var(--text-muted)' }} />
                <button onClick={toggleTheme} className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                  {theme === 'dark' ? '浅色模式' : '深色模式'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="transition-all duration-300 overflow-hidden"
        style={{ width: isPanelOpen ? 300 : 0, minWidth: isPanelOpen ? 300 : 0 }}>
        <FilePanel />
      </div>

      <ExportDialog isOpen={exportOpen} onClose={() => setExportOpen(false)}
        messages={messages} title={currentConv?.title || 'ChatAI'} />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
