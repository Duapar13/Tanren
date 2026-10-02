import { View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../constants/theme';

interface Props {
  index: number;
  children: React.ReactNode;
}

/** One logged set: numbered accent pill + the "reps x weight" text. */
export function SetLine({ index, children }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ThemedText variant="footnote" weight="800" color="accent">
          {index}
        </ThemedText>
      </View>
      <ThemedText variant="subhead" weight="600" style={{ flex: 1 }}>
        {children}
      </ThemedText>
    </View>
  );
}
