import { Pressable, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Radius } from '../constants/theme';

interface Props<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.fill,
        borderRadius: Radius.md,
        padding: 3,
      }}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              minHeight: 38,
              paddingVertical: 8,
              borderRadius: Radius.md - 3,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.accent : 'transparent',
            }}
          >
            <ThemedText
              variant="subhead"
              weight={selected ? '700' : '500'}
              style={{ color: selected ? colors.onAccent : colors.textSecondary }}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
