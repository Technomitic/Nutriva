/**
 * Nutriva — Dark Color Tokens
 * Matches the structure of colors.ts for seamless theme switching
 */

export const darkColors = {
  // Primary
  primary: '#66BB6A',
  primaryContainer: '#1B5E20',
  onPrimary: '#0D1B0F',
  onPrimaryContainer: '#A5D6A7',
  primaryFixed: '#C8E6C9',
  primaryFixedDim: '#81C784',

  // Secondary
  secondary: '#69F0AE',
  secondaryContainer: '#1B5E20',
  onSecondary: '#0D1B0F',

  // Tertiary
  tertiary: '#F48FB1',
  tertiaryContainer: '#4A1A2E',
  onTertiary: '#0D1B0F',
  tertiaryFixedDim: '#F48FB1',

  // Error
  error: '#EF5350',
  errorContainer: '#3E1A1A',

  // Surface & Background
  background: '#0D1B0F',
  surface: '#0D1B0F',
  surfaceDim: '#0A1409',
  surfaceBright: '#1A2E1C',
  surfaceContainerLowest: '#060E07',
  surfaceContainerLow: '#0F1F11',
  surfaceContainer: '#142614',
  surfaceContainerHigh: '#1A2E1C',
  surfaceContainerHighest: '#213524',
  surfaceTint: '#66BB6A',
  surfaceVariant: '#1A2E1C',

  // On Surface
  onSurface: '#E8F0E5',
  onSurfaceVariant: '#B0C4B0',
  inverseSurface: '#E8F0E5',
  inverseOnSurface: '#1A2E1C',
  inversePrimary: '#2E7D32',

  // Outline
  outline: '#5A7A5C',
  outlineVariant: '#354A36',

  // Utility
  white: '#E8F0E5',
  black: '#0D1B0F',
  transparent: 'transparent',

  // Status
  success: '#66BB6A',
  warning: '#FFB74D',
  info: '#64B5F6',
} as const;
