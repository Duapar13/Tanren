import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { Spacing } from '../constants/theme';

interface Props {
  title: string;
  /** Optional element aligned to the right of the title (a count, a small action...). */
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

/** Titled block used to group cards on every scrolling screen. Slides up gently when it appears. */
export function Section({ title, trailing, children }: Props) {
  return (
    <Animated.View entering={FadeInDown.duration(380)} style={{ gap: Spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 }}>
        <ThemedText variant="footnote" weight="700" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {title}
        </ThemedText>
        {trailing}
      </View>
      {children}
    </Animated.View>
  );
}
