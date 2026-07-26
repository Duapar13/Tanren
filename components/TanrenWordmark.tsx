import { Text, TextStyle } from 'react-native';
import { GOLD_ACCENT } from '../constants/theme';

interface Props {
  size?: number;
  style?: TextStyle;
}

export function TanrenWordmark({ size = 36, style }: Props) {
  return (
    <Text
      style={[
        {
          fontFamily: 'PermanentMarker_400Regular',
          fontSize: size,
          color: GOLD_ACCENT,
          includeFontPadding: false,
        },
        style,
      ]}
    >
      Tanren
    </Text>
  );
}
