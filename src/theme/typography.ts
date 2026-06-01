/**
 * Fresh — Design Tokens: Typography
 * Uses Manrope for headings, Inter for body (via Google Fonts / expo-font)
 */

import { Platform } from 'react-native';

const fontFamily = {
  heading: Platform.select({
    web: '"Manrope", sans-serif',
    default: 'Manrope',
  }) as string,
  body: Platform.select({
    web: '"Inter", system-ui, sans-serif',
    default: 'Inter',
  }) as string,
};

export const typography = {
  // Headings
  displayLarge: {
    fontFamily: fontFamily.heading,
    fontSize: 44,
    fontWeight: '800' as const,
    letterSpacing: -1.2,
    lineHeight: 48,
  },
  displayMedium: {
    fontFamily: fontFamily.heading,
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
    lineHeight: 37,
  },
  headlineLarge: {
    fontFamily: fontFamily.heading,
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  headlineMedium: {
    fontFamily: fontFamily.heading,
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  // Body
  titleMedium: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  bodyLarge: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 21,
  },
  bodySmall: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  // Labels
  labelLarge: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
} as const;
