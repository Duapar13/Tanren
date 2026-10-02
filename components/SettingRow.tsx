import { Pressable, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';

interface ToggleProps {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Label + optional hint on the left, themed switch on the right. */
export function ToggleRow({ label, hint, value, onValueChange, disabled }: ToggleProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 44 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="subhead" weight="600">
          {label}
        </ThemedText>
        {hint ? (
          <ThemedText variant="caption" color="tertiary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.accent, false: colors.fillSecondary }}
        ios_backgroundColor={colors.fillSecondary}
      />
    </View>
  );
}

interface NavProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
  /** Highlights the row with the brand colour (used for the support / donate entry). */
  accent?: boolean;
}

/** Tappable list row with an icon tile and a chevron — navigation entry in a settings screen. */
export function NavRow({ icon, label, hint, onPress, accent }: NavProps) {
  const { colors } = useTheme();
  const tint = accent ? colors.accent : colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        minHeight: 64,
        padding: Spacing.md,
        borderRadius: Radius.lg,
        backgroundColor: accent ? colors.accentSoft : colors.card,
        borderWidth: 1,
        borderColor: accent ? colors.accent + '4D' : colors.border,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: Radius.sm,
          backgroundColor: accent ? colors.accent + '26' : colors.fill,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText variant="subhead" weight="700" style={{ color: tint }}>
          {label}
        </ThemedText>
        {hint ? (
          <ThemedText variant="caption" color="tertiary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={accent ? colors.accent : colors.textTertiary} />
    </Pressable>
  );
}
