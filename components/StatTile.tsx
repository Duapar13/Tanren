import { View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';

interface Props {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
}

export function StatTile({ label, value, delta, deltaPositive }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.fill,
        borderRadius: Radius.md,
        padding: Spacing.md,
        gap: 2,
      }}
    >
      <ThemedText variant="caption" color="secondary" weight="600">
        {label}
      </ThemedText>
      <ThemedText variant="title2" weight="800">
        {value}
      </ThemedText>
      {delta ? (
        <ThemedText
          variant="caption"
          weight="700"
          style={{ color: deltaPositive ? colors.positive : colors.textSecondary }}
        >
          {delta}
        </ThemedText>
      ) : null}
    </View>
  );
}
