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
  const { sidebarCollapsed, sidebarWidth, toggleSidebar, theme, toggleTheme } = useSettingsStore();
  const { t, i18n } = useTranslation();

  return (
    <div
      className="fixed left-0 top-0 bottom-0 flex flex-col z-10 transition-all duration-300 ease-in-out overflow-hidden border-r border-border"
      style={{
        width: sidebarCollapsed ? 0 : sidebarWidth,
        background: sidebarCollapsed ? 'transparent' : 'var(--bg-secondary)',
      }}
      aria-hidden={sidebarCollapsed}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ minWidth: 280 }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-glow animate-pulse-glow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-text-primary whitespace-nowrap tracking-tight">{t('app.name')}</h2>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
            title={theme === 'light' ? t('theme.dark') : t('theme.light')}
            aria-label={theme === 'light' ? t('theme.dark') : t('theme.light')}
          >
            {theme === 'light' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            )}
          </button>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
            title={t('sidebar.collapse')}
            aria-label={t('sidebar.collapse')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-3 py-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-accent text-white hover:bg-accent-hover transition-all duration-200 text-sm font-medium shadow-sm shadow-accent/20"
          aria-label={t('app.newChat')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t('app.newChat')}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <ConversationList conversations={conversations} currentId={currentConversationId} />
      </div>

      <div className="border-t border-border p-3 space-y-1.5" style={{ minWidth: 200 }}>
        <button
          onClick={onToggleLanguage}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 text-xs"
          aria-label="Toggle language"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10M12 2a15.3 15.3 0 00-4 10 15.3 15.3 0 004 10" />
          </svg>
          {i18n.language === 'zh-CN' ? 'English' : '中文'}
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 text-xs"
          aria-label={t('settings.title')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          {t('settings.title')}
        </button>
      </div>
    </div>
  );
}
