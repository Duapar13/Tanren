import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../constants/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

/** Friendly placeholder for an empty list: soft icon disc + one muted line. */
export function EmptyState({ icon, text }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg }}>
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
      <ThemedText variant="subhead" color="secondary" style={{ textAlign: 'center' }}>
        {text}
      </ThemedText>
    </View>
  );
}
