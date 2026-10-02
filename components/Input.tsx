import { useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { FontSizes, Radius } from '../constants/theme';

export function Input({ style, onFocus, onBlur, ...rest }: TextInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.textTertiary}
      style={[
        {
          color: colors.text,
          fontSize: FontSizes.body,
          paddingVertical: 12,
          paddingHorizontal: 14,
          backgroundColor: colors.fill,
          borderRadius: Radius.md,
          borderWidth: 1.5,
          borderColor: focused ? colors.accent : colors.border,
        },
        style,
      ]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...rest}
    />
  );
}
