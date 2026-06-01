/**
 * Nutriva — useDynamic hook
 * Provides dynamic colors for dark mode support across all screens
 */

import { useThemeStore } from '../stores/themeStore';

/** Common dynamic color tokens used across all screens */
export function useDynamic() {
  const isDark = useThemeStore((s) => s.isDark);

  const text = isDark ? '#E8F0E5' : '#1B3C12';
  const textSecondary = isDark ? '#C8E6C9' : '#2E4A26';
  const textMuted = isDark ? 'rgba(200,220,195,0.5)' : 'rgba(27,60,18,0.5)';
  const textDim = isDark ? 'rgba(200,220,195,0.3)' : 'rgba(27,60,18,0.35)';
  const accent = isDark ? '#66BB6A' : '#2E7D32';
  const bg = isDark ? '#0D1B0F' : '#F5F7F5';
  const cardBg = isDark ? 'rgba(20,40,22,0.7)' : 'rgba(255,255,255,0.85)';
  const border = isDark ? 'rgba(102,187,106,0.15)' : 'rgba(46,125,50,0.08)';

  return {
    isDark,
    // Backgrounds
    bg,
    cardBg,
    headerBg: isDark ? 'rgba(13,27,15,0.95)' : 'rgba(255,255,255,0.9)',
    // Text
    text,
    textSecondary,
    textMuted,
    textDim,
    // Accent
    accent,
    accentLight: isDark ? 'rgba(102,187,106,0.15)' : 'rgba(46,125,50,0.08)',
    // Borders
    border,
    borderBright: isDark ? 'rgba(102,187,106,0.25)' : 'rgba(46,125,50,0.15)',
    // Input
    inputBg: isDark ? 'rgba(102,187,106,0.08)' : 'rgba(46,125,50,0.04)',
    inputBorder: isDark ? 'rgba(102,187,106,0.12)' : 'rgba(46,125,50,0.08)',
    // Tab bar
    tabBg: isDark ? '#0A1409' : '#FFFFFF',
    tabActive: isDark ? '#66BB6A' : '#2E7D32',
    tabInactive: isDark ? 'rgba(200,220,195,0.4)' : 'rgba(27,60,18,0.35)',
    // Summary / overlay
    summaryBg: isDark ? 'rgba(13,27,15,0.95)' : 'rgba(255,255,255,0.9)',
    // Buttons
    btnBg: isDark ? '#2E7D32' : '#2E7D32',
    btnText: '#FFFFFF',
    // Ready-to-use style objects for common patterns
    s: {
      screenBg: { backgroundColor: bg } as const,
      text: { color: text } as const,
      textSecondary: { color: textSecondary } as const,
      textMuted: { color: textMuted } as const,
      textDim: { color: textDim } as const,
      accent: { color: accent } as const,
      card: { backgroundColor: cardBg, borderColor: border } as const,
      border: { borderColor: border } as const,
      borderBottom: { borderBottomColor: border } as const,
      input: { backgroundColor: isDark ? 'rgba(102,187,106,0.08)' : 'rgba(46,125,50,0.04)', borderColor: isDark ? 'rgba(102,187,106,0.12)' : 'rgba(46,125,50,0.08)', color: text } as const,
    },
  };
}

