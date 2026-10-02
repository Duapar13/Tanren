import { View, ViewProps } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';

interface Props extends ViewProps {
  /** `accent` tints the card with the brand colour — for the one hero card a screen wants to lead with. */
  variant?: 'default' | 'accent';
}

export function Card({ style, variant = 'default', ...rest }: Props) {
  const { colors, scheme } = useTheme();
  const isAccent = variant === 'accent';
  return (
    <View
      style={[
        {
          backgroundColor: isAccent ? colors.accentSoft : colors.card,
          borderRadius: Radius.lg,
          padding: Spacing.lg,
          borderWidth: 1,
          borderColor: isAccent ? colors.accent + '4D' : colors.border,
          // Dark surfaces separate by border alone; on light a soft shadow lifts the card off the paper.
          ...(scheme === 'light' && !isAccent
            ? {
                shadowColor: colors.shadow,
                shadowOpacity: 0.06,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }
            : null),
        },
        style,
      ]}
      {...rest}
    />
  );
}
