import { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { TanrenWordmark } from './TanrenWordmark';
import { NinjaMascot } from './NinjaMascot';
import { useTheme } from '../hooks/useTheme';
import { GOLD_ACCENT } from '../constants/theme';

const HOLD_MS = 600;
const SPLIT_MS = 450;

const kanjiTextStyle = {
  fontSize: 38,
  fontWeight: '700' as const,
  color: GOLD_ACCENT,
  lineHeight: 42,
  textAlign: 'center' as const,
};

/**
 * The ninja mascot pops in first, then the two kanji Tanren is named after (鍛錬) hold briefly
 * and part ways — top character up, bottom character down — revealing the Latin wordmark.
 */
export function SplashView({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();

  const ninjaOpacity = useSharedValue(0);
  const ninjaScale = useSharedValue(0.3);
  const topOpacity = useSharedValue(1);
  const topTranslateY = useSharedValue(0);
  const bottomOpacity = useSharedValue(1);
  const bottomTranslateY = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkScale = useSharedValue(0.9);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    ninjaOpacity.value = withTiming(1, { duration: 280 });
    ninjaScale.value = withSpring(1, { damping: 9, stiffness: 120 });
    topTranslateY.value = withDelay(HOLD_MS, withTiming(-60, { duration: SPLIT_MS, easing: ease }));
    topOpacity.value = withDelay(HOLD_MS, withTiming(0, { duration: SPLIT_MS, easing: ease }));
    bottomTranslateY.value = withDelay(HOLD_MS, withTiming(60, { duration: SPLIT_MS, easing: ease }));
    bottomOpacity.value = withDelay(HOLD_MS, withTiming(0, { duration: SPLIT_MS, easing: ease }));
    wordmarkOpacity.value = withDelay(HOLD_MS + 150, withTiming(1, { duration: 380 }));
    wordmarkScale.value = withDelay(HOLD_MS + 150, withTiming(1, { duration: 380, easing: ease }));
  }, [
    ninjaOpacity,
    ninjaScale,
    bottomOpacity,
    bottomTranslateY,
    topOpacity,
    topTranslateY,
    wordmarkOpacity,
    wordmarkScale,
  ]);

  const ninjaStyle = useAnimatedStyle(() => ({
    opacity: ninjaOpacity.value,
    transform: [{ scale: ninjaScale.value }],
  }));
  const topStyle = useAnimatedStyle(() => ({
    opacity: topOpacity.value,
    transform: [{ translateY: topTranslateY.value }],
  }));
  const bottomStyle = useAnimatedStyle(() => ({
    opacity: bottomOpacity.value,
    transform: [{ translateY: bottomTranslateY.value }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ scale: wordmarkScale.value }],
  }));

  return (
    <View
      style={[
        { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 20 },
        style,
      ]}
    >
      <Animated.View style={ninjaStyle}>
        <NinjaMascot size={72} />
      </Animated.View>

      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.Text style={[kanjiTextStyle, topStyle]}>鍛</Animated.Text>
          <Animated.Text style={[kanjiTextStyle, bottomStyle]}>錬</Animated.Text>
        </View>
        <Animated.View style={wordmarkStyle}>
          <TanrenWordmark size={56} />
        </Animated.View>
      </View>
    </View>
  );
}
