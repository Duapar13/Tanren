import { useColorScheme } from 'react-native';
import { Palettes, ThemeColors } from '../constants/theme';

export interface Theme {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
}

export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { colors: Palettes[scheme], scheme };
}
