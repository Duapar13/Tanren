import { Text, TextProps } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { FontSizes } from '../constants/theme';

type Variant =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'subhead'
  | 'footnote'
  | 'caption';

interface Props extends TextProps {
  variant?: Variant;
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent';
  weight?: '400' | '500' | '600' | '700' | '800';
}

export function ThemedText({
  variant = 'body',
  color = 'primary',
  weight,
  style,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const textColor =
    color === 'primary'
      ? colors.text
      : color === 'secondary'
        ? colors.textSecondary
        : color === 'tertiary'
          ? colors.textTertiary
          : colors.accent;

  const defaultWeight =
    weight ??
    (variant === 'largeTitle' || variant === 'title1'
      ? '700'
      : variant === 'title2' || variant === 'title3' || variant === 'headline'
        ? '600'
        : '400');

  return (
    <Text
      style={[
        { color: textColor, fontSize: FontSizes[variant], fontWeight: defaultWeight },
        style,
      ]}
      {...rest}
    />
  );
}
