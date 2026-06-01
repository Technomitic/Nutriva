/**
 * Fresh — Design Tokens: Colors
 * Ported from the original Editorial Orchard CSS design system
 */

export const colors = {
  // Primary
  primary: '#154212',
  primaryContainer: '#2d5a27',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#9dd090',
  primaryFixed: '#bcf0ae',
  primaryFixedDim: '#a1d494',

  // Secondary
  secondary: '#006e1c',
  secondaryContainer: '#91f78e',
  onSecondary: '#ffffff',

  // Tertiary
  tertiary: '#60233e',
  tertiaryContainer: '#7c3a55',
  onTertiary: '#ffffff',
  tertiaryFixedDim: '#ffb0cc',

  // Error
  error: '#ba1a1a',
  errorContainer: '#ffdad6',

  // Surface & Background
  background: '#fafaf4',
  surface: '#fafaf4',
  surfaceDim: '#dadad5',
  surfaceBright: '#fafaf4',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f4f4ee',
  surfaceContainer: '#eeeee8',
  surfaceContainerHigh: '#e8e8e3',
  surfaceContainerHighest: '#e3e3dd',
  surfaceTint: '#3b6934',
  surfaceVariant: '#e3e3dd',

  // On Surface
  onSurface: '#1a1c19',
  onSurfaceVariant: '#42493e',
  inverseSurface: '#2f312d',
  inverseOnSurface: '#f1f1eb',
  inversePrimary: '#a1d494',

  // Outline
  outline: '#72796e',
  outlineVariant: '#c2c9bb',

  // Utility
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Status
  success: '#1e8e3e',
  warning: '#f57c00',
  info: '#1a73e8',
} as const;

export type ColorKey = keyof typeof colors;
