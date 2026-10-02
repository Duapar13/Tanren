import { View } from 'react-native';
import { ThemedText } from './ThemedText';
import { Spacing } from '../constants/theme';

interface Props {
  title: string;
  /** Optional element aligned to the right of the title (a count, a small action...). */
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

/** Titled block used to group cards on every scrolling screen. */
export function Section({ title, trailing, children }: Props) {
  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 }}>
        <ThemedText variant="footnote" weight="700" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {title}
        </ThemedText>
        {trailing}
      </View>
      {children}
    </View>
  );
}
