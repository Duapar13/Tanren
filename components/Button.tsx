import { Pressable, PressableProps } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';

interface Props extends PressableProps {
  title: string;
  variant?: 'filled' | 'plain' | 'destructive';
}

export function Button({ title, variant = 'filled', style, ...rest }: Props) {
  const { colors } = useTheme();

  if (variant === 'plain') {
    return (
      <Pressable style={style} {...rest}>
        <ThemedText variant="body" weight="600" color="accent">
          {title}
        </ThemedText>
      </Pressable>
    );
  }

  const isDestructive = variant === 'destructive';

  return (
    <Pressable
      style={(state) => [
        {
          backgroundColor: isDestructive ? 'transparent' : colors.accent,
          borderRadius: Radius.md,
          paddingVertical: Spacing.md,
          alignItems: 'center',
          opacity: rest.disabled ? 0.4 : state.pressed ? 0.7 : 1,
          ...(isDestructive
            ? { borderWidth: 1, borderColor: colors.negative }
            : null),
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <ThemedText
        variant="body"
        weight="600"
        style={{ color: isDestructive ? colors.negative : '#FFFFFF' }}
      >
        {title}
      </ThemedText>
    </Pressable>
  );
}
