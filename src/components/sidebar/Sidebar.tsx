import { useTranslation } from 'react-i18next';
import { ConversationList } from './ConversationList';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';

interface SidebarProps {
  onOpenSettings: () => void;
  onNewChat: () => void;
  onToggleLanguage: () => void;
}

export function Sidebar({ onOpenSettings, onNewChat, onToggleLanguage }: SidebarProps) {
  const { conversations, currentConversationId } = useChatStore();
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useSettingsStore();
  const { t, i18n } = useTranslation();

  if (sidebarCollapsed) return null;

  return (
    <div
      className="fixed left-0 top-0 bottom-0 flex flex-col bg-bg-secondary border-r border-border z-10"
      style={{ width: 280 }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-base font-semibold text-text-primary">{t('app.name')}</h2>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="btn-ghost p-1.5 rounded-lg text-lg" title={theme === 'light' ? t('theme.dark') : t('theme.light')}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={toggleSidebar} className="btn-ghost p-1.5 rounded-lg" title={t('sidebar.collapse')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <button onClick={onNewChat} className="flex items-center gap-2 mx-3 mt-3 px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-border text-text-primary transition-colors duration-150 text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t('app.newChat')}
      </button>

      <ConversationList conversations={conversations} currentId={currentConversationId} />

      <div className="mt-auto p-3 border-t border-border space-y-1">
        <button onClick={onToggleLanguage} className="sidebar-item w-full text-xs">
          🌐 {i18n.language === 'zh-CN' ? 'English' : '中文'}
        </button>
        <button onClick={onOpenSettings} className="sidebar-item w-full text-xs">
          ⚙️ {t('settings.title')}
        </button>
      </div>
    </div>
  );
}
