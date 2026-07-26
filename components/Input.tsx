import { TextInput, TextInputProps } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { FontSizes } from '../constants/theme';

export function Input({ style, ...rest }: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textTertiary}
      style={[
        {
          color: colors.text,
          fontSize: FontSizes.body,
          paddingVertical: 4,
        },
        style,
      ]}
      {...rest}
    />
  );
}
