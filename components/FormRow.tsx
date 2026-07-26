import { View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../constants/theme';

interface Props {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

export function FormRow({ label, children, hint }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
        gap: 6,
      }}
    >
      <ThemedText variant="subhead" color="secondary">
        {label}
      </ThemedText>
      {children}
      {hint ? (
        <ThemedText variant="caption" color="tertiary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}
