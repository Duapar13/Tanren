import { Pressable, ScrollView } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Radius } from '../constants/theme';

interface Props {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}

export function ChipSelector({ options, value, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: Radius.pill,
              backgroundColor: selected ? colors.accent : colors.fill,
              borderWidth: 1,
              borderColor: selected ? colors.accent : colors.border,
            }}
          >
            <ThemedText
              variant="subhead"
              weight="600"
              style={{ color: selected ? colors.onAccent : colors.text }}
            >
              {opt}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
