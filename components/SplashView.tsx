import { StyleProp, View, ViewStyle } from 'react-native';
import { TanrenWordmark } from './TanrenWordmark';
import { useTheme } from '../hooks/useTheme';

export function SplashView({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <TanrenWordmark size={56} />
    </View>
  );
}
