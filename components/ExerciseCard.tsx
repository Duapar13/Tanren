import { ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';

/** Gold banner + card below, matching ExerciseSetLogger's live-logging look — reused wherever
 * a past session's sets are grouped by exercise (session detail, today's review) so history
 * and live logging read as the same visual language. Collapsed by default and expanded by
 * tapping the banner, so a session with several exercises doesn't turn into a wall of sets. */
export function ExerciseCard({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={{ gap: 0 }}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.cardElevated,
          borderTopLeftRadius: Radius.lg,
          borderTopRightRadius: Radius.lg,
          borderBottomLeftRadius: expanded ? 0 : Radius.lg,
          borderBottomRightRadius: expanded ? 0 : Radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          borderLeftWidth: 4,
          borderLeftColor: colors.accent,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.md,
        }}
      >
        <ThemedText variant="headline" weight="800" style={{ flex: 1 }}>
          {title}
        </ThemedText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </Pressable>
      {expanded && (
        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor: colors.border,
            borderBottomLeftRadius: Radius.lg,
            borderBottomRightRadius: Radius.lg,
            padding: Spacing.md,
            gap: 4,
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
}
