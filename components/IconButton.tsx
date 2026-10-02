import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Radius } from '../constants/theme';

interface Props {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'default' | 'destructive' | 'positive' | 'accent';
  size?: number;
  disabled?: boolean;
}

/** Every icon-only action in the app should use this — a bare small icon has no visible tap target. */
export function IconButton({ name, onPress, variant = 'default', size = 20, disabled }: Props) {
  const { colors } = useTheme();

  const color =
    variant === 'destructive'
      ? colors.negative
      : variant === 'positive'
        ? colors.positive
        : variant === 'accent'
          ? colors.accent
          : colors.text;

  const backgroundColor =
    variant === 'destructive'
      ? colors.negative + '1F'
      : variant === 'positive'
        ? colors.positive + '1F'
        : variant === 'accent'
          ? colors.accentSoft
          : colors.fill;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={{
        width: 44,
        height: 44,
        borderRadius: Radius.md,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}
