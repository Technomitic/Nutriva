/**
 * Fresh — Glass Design Tokens
 * Centralized glassmorphism styles for the premium light-glass aesthetic
 */

import { ViewStyle, TextStyle } from 'react-native';

// ── Reusable color constants ──
const G = {
  cardBg: 'rgba(255, 255, 255, 0.7)',
  cardBgLight: 'rgba(255, 255, 255, 0.55)',
  cardBorder: 'rgba(46, 125, 50, 0.18)',
  cardBorderBright: 'rgba(46, 125, 50, 0.30)',
  inputBg: 'rgba(46, 125, 50, 0.06)',
  inputBorder: 'rgba(46, 125, 50, 0.15)',
  pillBg: 'rgba(46, 125, 50, 0.05)',
  pillBorder: 'rgba(46, 125, 50, 0.14)',
  pillActiveBg: 'rgba(46, 125, 50, 0.12)',
  overlayDark: 'rgba(255, 255, 255, 0.9)',
  glow: '#2E7D32',
  textPrimary: '#2E4A26',
  textSecondary: '#1B3C12',
  textMuted: 'rgba(27, 60, 18, 0.5)',
  textDim: 'rgba(27, 60, 18, 0.3)',
  accent: '#2E7D32',
  accentBright: '#43A047',
  screenBg: '#F5F7F5',
  screenBgAlt: '#EFF3EF',
  btnPrimary: '#2E7D32',
};

// ── Exportable style fragments ──
export const glass = {
  // Colors
  ...G,

  // Card: main glass container
  card: {
    backgroundColor: G.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: G.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  } as ViewStyle,

  // Card variant: lighter glass
  cardLight: {
    backgroundColor: G.cardBgLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: G.cardBorder,
  } as ViewStyle,

  // Card variant: brighter border (featured)
  cardFeatured: {
    backgroundColor: G.cardBg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: G.cardBorderBright,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  } as ViewStyle,

  // Pill / chip
  pill: {
    backgroundColor: G.pillBg,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: G.pillBorder,
  } as ViewStyle,

  pillActive: {
    backgroundColor: G.pillActiveBg,
    borderColor: G.cardBorderBright,
  } as ViewStyle,

  // Input field
  input: {
    backgroundColor: G.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: G.inputBorder,
  } as ViewStyle,

  // Badge
  badge: {
    backgroundColor: 'rgba(46, 125, 50, 0.10)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.20)',
  } as ViewStyle,

  // Section header text
  sectionTitle: {
    color: G.textSecondary,
    fontWeight: '700',
  } as TextStyle,

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(46, 125, 50, 0.14)',
  } as ViewStyle,
} as const;

