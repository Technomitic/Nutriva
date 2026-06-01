/**
 * Fresh — Design Tokens: Spacing & Radii
 */

export const spacing = {
  xs: 4,    // --space-1: 0.25rem
  sm: 8,    // --space-2: 0.5rem
  md: 12,   // --space-3: 0.75rem
  base: 16, // --space-4: 1rem
  lg: 20,   // --space-5: 1.25rem
  xl: 24,   // --space-6: 1.5rem
  '2xl': 32, // --space-8: 2rem
  '3xl': 40, // --space-10: 2.5rem
  '4xl': 48, // --space-12: 3rem
} as const;

export const radius = {
  sm: 12,   // --radius-sm: 0.75rem
  md: 24,   // --radius-md: 1.5rem
  lg: 32,   // --radius-lg: 2rem
  xl: 48,   // --radius-xl: 3rem
  full: 9999,
} as const;
