import { View, ViewProps } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface Props extends ViewProps {
  variant?: 'background' | 'grouped' | 'card' | 'transparent';
}

export function ThemedView({ variant = 'background', style, ...rest }: Props) {
  const { colors } = useTheme();
  const backgroundColor =
    variant === 'transparent'
      ? 'transparent'
      : variant === 'grouped'
        ? colors.groupedBackground
        : variant === 'card'
          ? colors.card
          : colors.background;

  return <View style={[{ backgroundColor }, style]} {...rest} />;
}
