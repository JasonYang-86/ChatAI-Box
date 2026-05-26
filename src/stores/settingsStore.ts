import { create } from 'zustand';
import type { Theme } from '@/types';

interface SettingsState {
  theme: Theme;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: (localStorage.getItem('chatai-theme') as Theme) || 'light',
  sidebarWidth: 280,
  sidebarCollapsed: false,

  setTheme: (theme) => {
    localStorage.setItem('chatai-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(newTheme);
  },

  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
}));
