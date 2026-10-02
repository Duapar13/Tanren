import { View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';

interface Props {
  protein: number;
  carbs: number;
  fat: number;
}

/** Protein / carbs / fat as three small colour-coded pills (P = accent, G = positive, L = muted). */
export function MacroPills({ protein, carbs, fat }: Props) {
  const { colors } = useTheme();
  const items = [
    { label: 'P', value: protein, color: colors.accent },
    { label: 'G', value: carbs, color: colors.positive },
    { label: 'L', value: fat, color: colors.textSecondary },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
      {items.map((m) => (
        <View
          key={m.label}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: m.color + '1F',
          }}
        >
          <ThemedText variant="caption" weight="800" style={{ color: m.color }}>
            {m.label}
          </ThemedText>
          <ThemedText variant="caption" weight="700">
            {m.value}g
          </ThemedText>
        </View>
      ))}
    </View>
  );
}
