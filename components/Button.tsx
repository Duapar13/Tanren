import { Pressable, PressableProps } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';

interface Props extends PressableProps {
  title: string;
  /** `tonal` is the quieter secondary action: tinted fill, accent text. */
  variant?: 'filled' | 'tonal' | 'plain' | 'destructive';
}

export function Button({ title, variant = 'filled', style, ...rest }: Props) {
  const { colors } = useTheme();

  if (variant === 'plain') {
    return (
      <Pressable hitSlop={8} style={style} {...rest}>
        <ThemedText variant="body" weight="600" color="accent">
          {title}
        </ThemedText>
      </Pressable>
    );
  }

  const isDestructive = variant === 'destructive';
  const isTonal = variant === 'tonal';

  const backgroundColor = isDestructive ? colors.negative + '14' : isTonal ? colors.accentSoft : colors.accent;
  const textColor = isDestructive ? colors.negative : isTonal ? colors.accent : colors.onAccent;

  return (
    <Pressable
      style={(state) => [
        {
          backgroundColor,
          borderRadius: Radius.md,
          minHeight: 50,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: rest.disabled ? 0.4 : state.pressed ? 0.75 : 1,
          transform: [{ scale: state.pressed ? 0.985 : 1 }],
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <ThemedText variant="body" weight="700" style={{ color: textColor }}>
        {title}
      </ThemedText>
    </Pressable>
  );
}
