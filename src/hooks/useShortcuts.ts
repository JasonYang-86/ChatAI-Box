import { useEffect } from 'react';

export interface ShortcutHandlers {
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
  onToggleTheme?: () => void;
  onToggleSettings?: () => void;
  onToggleKnowledge?: () => void;
  onExport?: () => void;
  onClose?: () => void;
}

export function useShortcuts(handlers: ShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === 'n') {
        e.preventDefault();
        handlers.onNewChat?.();
      } else if (mod && e.key === 'b') {
        e.preventDefault();
        handlers.onToggleSidebar?.();
      } else if (mod && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        handlers.onToggleTheme?.();
      } else if (mod && e.key === ',') {
        e.preventDefault();
        handlers.onToggleSettings?.();
      } else if (mod && e.key === 'k') {
        e.preventDefault();
        handlers.onToggleKnowledge?.();
      } else if (mod && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        handlers.onExport?.();
      } else if (mod && e.key === 'w') {
        e.preventDefault();
        handlers.onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handlers]);
}
