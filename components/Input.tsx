import { TextInput, TextInputProps } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { FontSizes, Radius } from '../constants/theme';

export function Input({ style, ...rest }: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textTertiary}
      style={[
        {
          color: colors.text,
          fontSize: FontSizes.body,
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: colors.fill,
          borderRadius: Radius.sm,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      {...rest}
    />
  );
}
