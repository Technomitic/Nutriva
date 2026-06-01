/**
 * Nutriva — Theme Context
 * Provides light/dark theme switching with persistence
 * Only affects screens that explicitly use `useTheme()` hook
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as lightColors } from './colors';
import { darkColors } from './darkColors';
import { glass as lightGlass } from './glass';
import type { ViewStyle, TextStyle } from 'react-native';

const THEME_KEY = 'nutriva-theme-mode';

type ThemeMode = 'light' | 'dark';

// Dark glass tokens
const darkGlassValues = {
  cardBg: 'rgba(20, 40, 22, 0.7)',
  cardBgLight: 'rgba(20, 40, 22, 0.5)',
  cardBorder: 'rgba(102, 187, 106, 0.15)',
  cardBorderBright: 'rgba(102, 187, 106, 0.3)',
  inputBg: 'rgba(102, 187, 106, 0.08)',
  inputBorder: 'rgba(102, 187, 106, 0.12)',
  pillBg: 'rgba(102, 187, 106, 0.08)',
  pillBorder: 'rgba(102, 187, 106, 0.12)',
  pillActiveBg: 'rgba(102, 187, 106, 0.2)',
  overlayDark: 'rgba(13, 27, 15, 0.95)',
  glow: '#66BB6A',
  textPrimary: '#C8E6C9',
  textSecondary: '#E8F0E5',
  textMuted: 'rgba(200, 220, 195, 0.5)',
  textDim: 'rgba(200, 220, 195, 0.3)',
  accent: '#66BB6A',
  accentBright: '#81C784',
  screenBg: '#0D1B0F',
  screenBgAlt: '#142614',
  btnPrimary: '#2E7D32',
};

const darkGlass = {
  ...darkGlassValues,
  card: {
    backgroundColor: darkGlassValues.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: darkGlassValues.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  } as ViewStyle,
  cardLight: {
    backgroundColor: darkGlassValues.cardBgLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkGlassValues.cardBorder,
  } as ViewStyle,
  cardFeatured: {
    backgroundColor: darkGlassValues.cardBg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: darkGlassValues.cardBorderBright,
    shadowColor: '#66BB6A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  } as ViewStyle,
  pill: {
    backgroundColor: darkGlassValues.pillBg,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: darkGlassValues.pillBorder,
  } as ViewStyle,
  pillActive: {
    backgroundColor: darkGlassValues.pillActiveBg,
    borderColor: darkGlassValues.cardBorderBright,
  } as ViewStyle,
  input: {
    backgroundColor: darkGlassValues.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkGlassValues.inputBorder,
  } as ViewStyle,
  badge: {
    backgroundColor: 'rgba(102, 187, 106, 0.15)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(102, 187, 106, 0.2)',
  } as ViewStyle,
  sectionTitle: {
    color: darkGlassValues.textSecondary,
    fontWeight: '700',
  } as TextStyle,
  divider: {
    height: 1,
    backgroundColor: 'rgba(102, 187, 106, 0.1)',
  } as ViewStyle,
} as const;

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  themeMode: 'light',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  // Load saved preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setThemeModeState(saved);
      }
    }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const isDark = themeMode === 'dark';

  const value = useMemo(() => ({
    isDark,
    themeMode,
    toggleTheme,
  }), [isDark, themeMode, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return {
    ...ctx,
    // Provide colors/glass based on current mode
    colors: ctx.isDark ? darkColors as any : lightColors,
    glass: ctx.isDark ? darkGlass as any : lightGlass,
  };
}
