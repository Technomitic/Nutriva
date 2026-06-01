/**
 * Nutriva — Internationalization (i18n)
 * Supports English and Hindi with device locale detection
 * Uses Zustand for reactive locale changes across all screens
 */

import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import en from './en.json';
import hi from './hi.json';

const i18n = new I18n({ en, hi });

// Default to device locale
i18n.locale = Localization.getLocales()[0]?.languageCode || 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const LOCALE_KEY = 'nutriva-locale';

/** Zustand store for reactive locale state */
interface LocaleState {
  locale: string;
  setLocale: (locale: string) => void;
  loadSavedLocale: () => Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: i18n.locale,

  setLocale: (locale: string) => {
    i18n.locale = locale;
    set({ locale });
    AsyncStorage.setItem(LOCALE_KEY, locale).catch(() => {});
  },

  loadSavedLocale: async () => {
    try {
      const saved = await AsyncStorage.getItem(LOCALE_KEY);
      if (saved) {
        i18n.locale = saved;
        set({ locale: saved });
      }
    } catch {}
  },
}));

/** Load saved locale preference (called once on startup) */
export async function loadSavedLocale() {
  await useLocaleStore.getState().loadSavedLocale();
}

/** Legacy — Change and persist locale */
export async function setLocale(locale: string) {
  useLocaleStore.getState().setLocale(locale);
}

/** Get current locale */
export function getLocale(): string {
  return i18n.locale;
}

/** Translation function — use the reactive hook version useT() in components */
export function t(key: string, options?: Record<string, any>): string {
  return i18n.t(key, options);
}

/** Reactive translation hook — re-renders when locale changes */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  // locale dependency forces re-render when language changes
  return (key: string, options?: Record<string, any>): string => {
    return i18n.t(key, options);
  };
}

export default i18n;
