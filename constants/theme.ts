// Brand colours — also used by the mascot / wordmark / splash, which don't follow the light/dark
// palette (they're illustrations, so they keep one fixed gold).
export const GOLD_ACCENT = '#E9A23B';
export const GREEN_ACCENT = '#2F7A4A';
export const RED_ACCENT = '#A33A2D';

const lightPalette = {
  background: '#F7F5F0',
  groupedBackground: '#F7F5F0',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  border: '#E8E4DA',
  text: '#15161A',
  textSecondary: '#62666F',
  textTertiary: '#9A9DA6',
  separator: '#ECE8DF',
  fill: '#F0EDE5',
  fillSecondary: '#E6E2D7',
  overlay: 'rgba(12,12,16,0.45)',
  accent: '#C46F00',
  accentSoft: 'rgba(196,111,0,0.12)',
  onAccent: '#FFFFFF',
  positive: '#1E8A55',
  negative: '#C73B2C',
  warning: '#B26B00',
  tabBarBackground: '#FFFFFF',
  tabBarInactive: '#9A9DA6',
  tabBarActive: '#C46F00',
  shadow: '#2B2110',
};

const darkPalette = {
  background: '#0A0B0F',
  groupedBackground: '#0A0B0F',
  card: '#14161C',
  cardElevated: '#1A1D25',
  border: '#232731',
  text: '#F4F5F7',
  textSecondary: '#A0A6B4',
  textTertiary: '#636A79',
  separator: '#1F232C',
  fill: '#1A1D25',
  fillSecondary: '#252935',
  overlay: 'rgba(0,0,0,0.65)',
  accent: '#F5A93B',
  accentSoft: 'rgba(245,169,59,0.14)',
  onAccent: '#1A1100',
  positive: '#3DD68C',
  negative: '#FF6B5B',
  warning: '#FFB84D',
  tabBarBackground: '#101218',
  tabBarInactive: '#636A79',
  tabBarActive: '#F5A93B',
  shadow: '#000000',
};

export const Palettes = {
  light: lightPalette,
  dark: darkPalette,
};

export type ThemeColors = typeof lightPalette;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
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
  body: 16,
  headline: 17,
  title3: 20,
  title2: 24,
  title1: 30,
  largeTitle: 36,
};
