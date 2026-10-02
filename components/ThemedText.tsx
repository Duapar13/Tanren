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

// Big titles get tightened tracking, small captions slightly opened — the usual display-type feel.
const LETTER_SPACING: Partial<Record<Variant, number>> = {
  largeTitle: -0.8,
  title1: -0.6,
  title2: -0.4,
  title3: -0.2,
  caption: 0.2,
};

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
      ? '800'
      : variant === 'title2' || variant === 'title3' || variant === 'headline'
        ? '700'
        : '400');

  return (
    <Text
      style={[
        {
          color: textColor,
          fontSize: FontSizes[variant],
          fontWeight: defaultWeight,
          letterSpacing: LETTER_SPACING[variant],
        },
        style,
      ]}
      {...rest}
    />
  );
}
