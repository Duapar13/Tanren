import { Text, TextStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface Props {
  size?: number;
  style?: TextStyle;
}

export function NingymaWordmark({ size = 36, style }: Props) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: 'PermanentMarker_400Regular',
          fontSize: size,
          color: colors.accent,
          includeFontPadding: false,
        },
        style,
      ]}
    >
      Ningyma
    </Text>
  );
}
