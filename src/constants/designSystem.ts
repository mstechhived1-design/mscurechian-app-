export const COLORS = {
  // Base Colors
  surface: '#F7F9FB', // Base Layer
  surface_container: '#ECEEF0', // Section Layer
  surface_container_low: '#F2F4F6', // Tonal Depth
  surface_container_lowest: '#FFFFFF', // Component Layer
  surface_container_high: '#E6E8EA',
  surface_container_highest: '#E0E3E5',

  // Brand Colors
  primary: '#005AB5', // Cognitive Trust Blue
  primary_container: '#2273D9', // Secondary Blue
  primary_fixed_dim: '#AAC7FF', // Focus stroke

  secondary: '#1B6D24', // Restorative Health Green
  secondary_container: '#A0F399', // Stable patient chip

  error: '#BA1A1A', // Life-critical data
  error_container: '#FFDAD6', // Critical patient chip

  // Text Colors
  on_surface: '#191C1E', // Dual-font strategy text
  on_primary: '#FFFFFF',
  outline_variant: '#C1C6D7', // 15% opacity fallback
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  '3xl': 48,
  '4xl': 64,
  '5xl': 112, // 7rem bottom margin
};

export const RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12, // 0.75rem for input fields
  lg: 16,
  xl: 24, // 1.5rem for primary buttons
  full: 9999, // Pill-like feel
};

export const TYPOGRAPHY = {
  // Manrope (Headlines) - Fallback to System
  display_lg: {
    fontSize: 56, // 3.5rem
    fontWeight: '700' as const,
    lineHeight: 64,
  },
  headline_md: {
    fontSize: 28, // 1.75rem
    fontWeight: '600' as const,
    lineHeight: 36,
  },
  // Inter (Body/Data) - Fallback to System
  body_md: {
    fontSize: 16,
    lineHeight: 24,
  },
  body_sm: {
    fontSize: 12, // 0.75rem
    lineHeight: 16,
  },
  label_lg: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};
