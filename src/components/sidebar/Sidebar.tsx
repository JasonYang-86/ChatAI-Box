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
      className="fixed left-0 top-0 bottom-0 flex flex-col z-20 transition-all duration-300 overflow-hidden"
      style={{
        width: sidebarCollapsed ? 0 : sidebarWidth,
        borderRight: sidebarCollapsed ? 'none' : '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}
    >
      <div className="flex items-center justify-between px-4 h-[48px] shrink-0" style={{ minWidth: 260 }}>
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FF403A, #FF6B6B)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <span className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            ChatAI
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={toggleTheme} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}>
            {theme === 'light'
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>}
          </button>
          <button onClick={toggleSidebar} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        </div>
      </div>

      <div className="px-3 py-2">
        <button onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium text-white transition-all duration-200"
          style={{ background: 'linear-gradient(135deg, #FF403A, #FF6B6B)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.92'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          新对话
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <ConversationList conversations={conversations} currentId={currentConversationId} />
      </div>

      <div className="p-3 space-y-1 border-t" style={{ borderColor: 'var(--border)', minWidth: 200 }}>
        <button onClick={onToggleLanguage}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-colors hover:bg-[var(--bg-tertiary)]"
          style={{ color: 'var(--text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10M12 2a15.3 15.3 0 00-4 10 15.3 15.3 0 004 10" /></svg>
          {i18n.language === 'zh-CN' ? 'English' : '中文'}
        </button>
        <button onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-colors hover:bg-[var(--bg-tertiary)]"
          style={{ color: 'var(--text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          设置
        </button>
      </div>
    </div>
  );
}
