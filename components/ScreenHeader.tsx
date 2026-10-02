import { View } from 'react-native';
import { NingymaWordmark } from './NingymaWordmark';
import { NinjaMascot, NinjaReaction } from './NinjaMascot';
import { SyncPill } from './SyncPill';
import { ThemedText } from './ThemedText';
import { Spacing } from '../constants/theme';

interface Props {
  right?: React.ReactNode;
  mascot?: NinjaReaction;
  /** Large screen title, replacing the brand wordmark on the left. */
  title?: string;
  subtitle?: string;
}

export function ScreenHeader({ right, mascot, title, subtitle }: Props) {
  return (
    <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm }}>
        {title ? (
          <ThemedText variant="largeTitle" style={{ flex: 1 }} numberOfLines={1}>
            {title}
          </ThemedText>
        ) : (
          <NingymaWordmark size={32} />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <SyncPill />
          {right ?? (mascot && <NinjaMascot size={title ? 46 : 52} reaction={mascot} />)}
        </View>
      </View>
      {subtitle ? (
        <ThemedText variant="subhead" color="secondary">
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}
