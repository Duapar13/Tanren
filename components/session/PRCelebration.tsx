import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { Radius, Spacing } from '../../constants/theme';

interface Props {
  /** `null` hides it. */
  record: { name: string; weight: string } | null;
  onDone: () => void;
}

const VISIBLE_MS = 2400;

/** Pops a "new record" banner over the session for a couple of seconds, then dismisses itself. */
export function PRCelebration({ record, onDone }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const progress = useSharedValue(0);
  const trophyScale = useSharedValue(0);

  useEffect(() => {
    if (!record) return;
    progress.value = 0;
    trophyScale.value = 0;
    progress.value = withTiming(1, { duration: 220 });
    trophyScale.value = withSequence(withSpring(1.35, { damping: 5, stiffness: 180 }), withSpring(1, { damping: 8 }));
    progress.value = withDelay(VISIBLE_MS - 260, withTiming(0, { duration: 240 }));
    const id = setTimeout(onDone, VISIBLE_MS);
    return () => clearTimeout(id);
    // The banner is keyed by the record object; a new record restarts the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -24 }, { scale: 0.92 + progress.value * 0.08 }],
  }));
  const trophyStyle = useAnimatedStyle(() => ({ transform: [{ scale: trophyScale.value }] }));

  if (!record) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 70, left: Spacing.lg, right: Spacing.lg, zIndex: 20 }}>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.md,
            padding: Spacing.lg,
            borderRadius: Radius.xl,
            backgroundColor: colors.cardElevated,
            borderWidth: 2,
            borderColor: colors.accent,
            shadowColor: colors.accent,
            shadowOpacity: 0.5,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 6 },
            elevation: 12,
          },
          bannerStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            },
            trophyStyle,
          ]}
        >
          <Ionicons name="trophy" size={26} color={colors.onAccent} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="headline" weight="800" color="accent">
            {t.session.newRecord}
          </ThemedText>
          <ThemedText variant="subhead" weight="600" numberOfLines={1}>
            {record.name} · {record.weight}
          </ThemedText>
        </View>
      </Animated.View>
    </View>
  );
}
