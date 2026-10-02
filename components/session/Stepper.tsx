import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { useTheme } from '../../hooks/useTheme';
import { Radius } from '../../constants/theme';
import { haptics } from '../../lib/haptics';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  min?: number;
  decimals?: number;
  placeholder?: string;
}

function parse(value: string): number | null {
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Big number field flanked by − / + buttons, so a set is adjusted with thumbs instead of typing. */
export function Stepper({ label, value, onChange, step, min = 0, decimals = 1, placeholder = '0' }: Props) {
  const { colors } = useTheme();

  const bump = (direction: 1 | -1) => {
    haptics.tap();
    const current = parse(value) ?? 0;
    const next = Math.max(min, current + direction * step);
    const factor = Math.pow(10, decimals);
    onChange(String(Math.round(next * factor) / factor));
  };

  const button = (direction: 1 | -1) => (
    <Pressable
      onPress={() => bump(direction)}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: pressed ? colors.fillSecondary : colors.fill,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Ionicons name={direction === 1 ? 'add' : 'remove'} size={22} color={colors.text} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <ThemedText variant="caption" weight="700" color="secondary" style={{ textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        {button(-1)}
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          selectTextOnFocus
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'center',
            fontSize: 30,
            fontWeight: '800',
            color: colors.text,
            paddingVertical: 8,
            borderRadius: Radius.md,
          }}
        />
        {button(1)}
      </View>
    </View>
  );
}
