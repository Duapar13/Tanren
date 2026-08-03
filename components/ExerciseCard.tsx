import { ReactNode } from 'react';
import { View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';

/** Gold banner + card below, matching ExerciseSetLogger's live-logging look — reused wherever
 * a past session's sets are grouped by exercise (session detail, today's review) so history
 * and live logging read as the same visual language. */
export function ExerciseCard({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 0 }}>
      <View
        style={{
          backgroundColor: colors.accent,
          borderRadius: Radius.md,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.md,
        }}
      >
        <ThemedText variant="headline" weight="700" style={{ color: '#FFFFFF' }}>
          {title}
        </ThemedText>
      </View>
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
    </View>
  );
}
