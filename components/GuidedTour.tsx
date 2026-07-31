import { useEffect, useState } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Radius, Spacing } from '../constants/theme';

// Mirrors the real tab order in app/(tabs)/_layout.tsx — the highlight ring below slides to
// whichever position matches the tab bar icon it's currently describing.
const STEP_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'home',
  'barbell',
  'trending-up',
  'shield',
  'nutrition',
  'person',
];

const RING_SIZE = 56;

interface Props {
  visible: boolean;
  onFinish: () => void;
  tabBarHeight: number;
}

export function GuidedTour({ visible, onFinish, tabBarHeight }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [stepIndex, setStepIndex] = useState(0);
  const STEPS = t.tour.steps.map((s, i) => ({ ...s, icon: STEP_ICONS[i] }));
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const segmentWidth = width / STEPS.length;
  const ringX = useSharedValue(segmentWidth * 0.5);

  useEffect(() => {
    if (visible) setStepIndex(0);
  }, [visible]);

  useEffect(() => {
    ringX.value = withSpring(segmentWidth * (stepIndex + 0.5), { damping: 16, stiffness: 150 });
  }, [stepIndex, segmentWidth, ringX]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ringX.value - RING_SIZE / 2 }],
  }));
  // The caret sits inside a card inset by Spacing.lg from the screen edge, so its position
  // has to be translated into that card's local coordinate space (and clamped so it doesn't
  // slide past the card's rounded corners for the first/last tabs).
  const cardWidth = width - Spacing.lg * 2;
  const caretStyle = useAnimatedStyle(() => {
    const localX = ringX.value - Spacing.lg;
    const clamped = Math.min(Math.max(localX, 20), cardWidth - 20);
    return { left: clamped - 7 };
  });

  const next = () => {
    if (isLast) {
      setStepIndex(0);
      onFinish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1 }}>
        {/* Dimmed area above the tab bar — the tab bar itself stays undimmed so the highlight
            ring below appears to spotlight the real icons through the transparent modal. */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: tabBarHeight,
            backgroundColor: colors.overlay,
          }}
        />

        {/* Tooltip card, anchored just above the tab bar, with a caret + glowing ring that
            slide horizontally to whichever tab the current step is describing. */}
        <View
          style={{
            position: 'absolute',
            left: Spacing.lg,
            right: Spacing.lg,
            bottom: tabBarHeight + RING_SIZE / 2 + Spacing.sm,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: Spacing.lg,
              gap: Spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.accent + '26',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={step.icon} size={18} color={colors.accent} />
              </View>
              <ThemedText variant="title3" weight="700">
                {step.title}
              </ThemedText>
            </View>
            <ThemedText color="secondary">{step.description}</ThemedText>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs }}>
              {!isLast ? (
                <Pressable onPress={onFinish}>
                  <ThemedText variant="footnote" color="tertiary">
                    {t.tour.skip}
                  </ThemedText>
                </Pressable>
              ) : (
                <View />
              )}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i === stepIndex ? colors.accent : colors.separator,
                    }}
                  />
                ))}
              </View>
              <Pressable
                onPress={next}
                style={{
                  paddingVertical: Spacing.sm,
                  paddingHorizontal: Spacing.md,
                  borderRadius: Radius.md,
                  backgroundColor: colors.accent,
                }}
              >
                <ThemedText variant="footnote" weight="600" style={{ color: '#FFFFFF' }}>
                  {isLast ? t.tour.start : t.tour.next}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Caret pointing down from the card toward the highlighted tab icon. */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                bottom: -7,
                width: 14,
                height: 14,
                backgroundColor: colors.card,
                borderRightWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.border,
                transform: [{ rotate: '45deg' }],
              },
              caretStyle,
            ]}
          />
        </View>

        {/* Glowing ring spotlighting the current tab bar icon. */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              bottom: (tabBarHeight - RING_SIZE) / 2,
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: RING_SIZE / 2,
              borderWidth: 2,
              borderColor: colors.accent,
              backgroundColor: colors.accent + '1F',
            },
            ringStyle,
          ]}
        />
      </View>
    </Modal>
  );
}
