export const GOLD_ACCENT = '#C4881F';
export const GREEN_ACCENT = '#2F7A4A';
export const RED_ACCENT = '#A33A2D';

const lightPalette = {
  background: '#FFFFFF',
  groupedBackground: '#F2F2F7',
  card: '#FFFFFF',
  border: '#E5E5EA',
  text: '#000000',
  textSecondary: '#6B6B70',
  textTertiary: '#AEAEB2',
  separator: '#D1D1D6',
  fill: '#F2F2F7',
  fillSecondary: '#E8E8ED',
  overlay: 'rgba(0,0,0,0.4)',
  accent: GOLD_ACCENT,
  positive: GREEN_ACCENT,
  negative: RED_ACCENT,
  tabBarBackground: '#F9F9F9',
  tabBarInactive: '#9A9A9E',
  tabBarActive: GOLD_ACCENT,
};

const darkPalette = {
  background: '#000000',
  groupedBackground: '#000000',
  card: '#1C1C1E',
  border: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#98989F',
  textTertiary: '#5C5C5E',
  separator: '#38383A',
  fill: '#1C1C1E',
  fillSecondary: '#2C2C2E',
  overlay: 'rgba(0,0,0,0.6)',
  accent: GOLD_ACCENT,
  positive: GREEN_ACCENT,
  negative: RED_ACCENT,
  tabBarBackground: '#0B0B0C',
  tabBarInactive: '#6E6E73',
  tabBarActive: GOLD_ACCENT,
};

export const Palettes = {
  light: lightPalette,
  dark: darkPalette,
};

export type ThemeColors = typeof lightPalette;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const FontSizes = {
  caption: 12,
  footnote: 13,
  subhead: 15,
  body: 17,
  headline: 17,
  title3: 20,
  title2: 22,
  title1: 28,
  largeTitle: 34,
};
