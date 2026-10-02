import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { Gyma } from './mascot/Gyma';
import type { GymaPose, NinjaReaction } from './mascot/GymaFigure';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../constants/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

// Each empty state keeps its icon name as a hint at the situation; Gyma plays the matching part.
// Offline is the one that matters most: Gyma naps until the network is back.
const MASCOT_FOR_ICON: Partial<Record<keyof typeof Ionicons.glyphMap, { pose: GymaPose; reaction: NinjaReaction }>> = {
  'cloud-offline-outline': { pose: 'rest', reaction: 'sleepy' },
  'barbell-outline': { pose: 'lift', reaction: 'focused' },
  'people-outline': { pose: 'bust', reaction: 'friendly' },
  'trophy-outline': { pose: 'bust', reaction: 'proud' },
  'list-outline': { pose: 'bust', reaction: 'focused' },
  'search-outline': { pose: 'bust', reaction: 'focused' },
  'time-outline': { pose: 'bust', reaction: 'content' },
};

/** Friendly placeholder for an empty list: Gyma (or a soft icon disc) + one muted line. */
export function EmptyState({ icon, text }: Props) {
  const { colors } = useTheme();
  const mascot = MASCOT_FOR_ICON[icon];
  const fullBody = mascot && mascot.pose !== 'bust';
  return (
    <View style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg }}>
      {mascot ? (
        <Gyma pose={mascot.pose} reaction={mascot.reaction} size={fullBody ? 96 : 92} animated />
      ) : (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={28} color={colors.accent} />
        </View>
      )}
      <ThemedText variant="subhead" color="secondary" style={{ textAlign: 'center' }}>
        {text}
      </ThemedText>
    </View>
  );
}
