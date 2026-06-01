/**
 * Nutriva — Theme Store (Zustand)
 * Global theme state accessible from any component without Context
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'nutriva-theme-mode';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,

  toggleTheme: () => {
    const next = !get().isDark;
    set({ isDark: next });
    AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
  },

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === 'dark') set({ isDark: true });
    } catch {}
  },
}));

/**
 * Dynamic color helper — returns the right color based on theme
 * Usage: const bg = dc('#F5F7F5', '#0D1B0F');
 */
export function dc(light: string, dark: string): string {
  return useThemeStore.getState().isDark ? dark : light;
}
