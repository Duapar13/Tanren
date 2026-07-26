import { View } from 'react-native';
import { TanrenWordmark } from './TanrenWordmark';
import { Spacing } from '../constants/theme';

interface Props {
  right?: React.ReactNode;
}

export function ScreenHeader({ right }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.sm,
      }}
    >
      <TanrenWordmark size={32} />
      {right}
    </View>
  );
}
