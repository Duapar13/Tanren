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
        gap: 4,
      }}
    >
      <ThemedText variant="caption" color="secondary">
        {label}
      </ThemedText>
      <ThemedText variant="title2" weight="700">
        {value}
      </ThemedText>
      {delta ? (
        <ThemedText
          variant="caption"
          weight="600"
          color={deltaPositive ? 'primary' : 'secondary'}
          style={{ opacity: deltaPositive ? 1 : 0.7 }}
        >
          {delta}
        </ThemedText>
      ) : null}
    </View>
  );
}
