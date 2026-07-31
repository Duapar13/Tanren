import { View } from 'react-native';
import { TanrenWordmark } from './TanrenWordmark';
import { NinjaMascot, NinjaReaction } from './NinjaMascot';
import { Spacing } from '../constants/theme';

interface Props {
  right?: React.ReactNode;
  mascot?: NinjaReaction;
}

export function ScreenHeader({ right, mascot }: Props) {
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
      {right ?? (mascot && <NinjaMascot size={34} reaction={mascot} />)}
    </View>
  );
}
