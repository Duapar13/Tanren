import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { XPBadge } from './XPBadge';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  points: number;
}

/** Full-width skill row — replaces the old row of square stat tiles with something that reads
 * at a glance: icon + name on the left, an XP chip on the right instead of plain "+N pts" text. */
export function SkillBanner({ icon, label, points }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.fill,
        borderRadius: Radius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.accent + '26',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={16} color={colors.accent} />
        </View>
        <ThemedText variant="subhead" weight="600">
          {label}
        </ThemedText>
      </View>
      <XPBadge points={points} />
    </View>
  );
}
