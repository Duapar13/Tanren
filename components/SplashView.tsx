import { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { TanrenWordmark } from './TanrenWordmark';
import { useTheme } from '../hooks/useTheme';
import { GOLD_ACCENT } from '../constants/theme';

const HOLD_MS = 400;
const SPLIT_MS = 380;

const kanjiTextStyle = {
  fontSize: 38,
  fontWeight: '700' as const,
  color: GOLD_ACCENT,
  lineHeight: 42,
  textAlign: 'center' as const,
};

/**
 * The two kanji Tanren is named after (鍛錬) hold briefly, then part ways — top character up,
 * bottom character down — like the app icon splitting open, revealing the Latin wordmark.
 */
export function SplashView({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();

  const topOpacity = useSharedValue(1);
  const topTranslateY = useSharedValue(0);
  const bottomOpacity = useSharedValue(1);
  const bottomTranslateY = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkScale = useSharedValue(0.9);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    topTranslateY.value = withDelay(HOLD_MS, withTiming(-60, { duration: SPLIT_MS, easing: ease }));
    topOpacity.value = withDelay(HOLD_MS, withTiming(0, { duration: SPLIT_MS, easing: ease }));
    bottomTranslateY.value = withDelay(HOLD_MS, withTiming(60, { duration: SPLIT_MS, easing: ease }));
    bottomOpacity.value = withDelay(HOLD_MS, withTiming(0, { duration: SPLIT_MS, easing: ease }));
    wordmarkOpacity.value = withDelay(HOLD_MS + 120, withTiming(1, { duration: 320 }));
    wordmarkScale.value = withDelay(HOLD_MS + 120, withTiming(1, { duration: 320, easing: ease }));
  }, [bottomOpacity, bottomTranslateY, topOpacity, topTranslateY, wordmarkOpacity, wordmarkScale]);

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
        { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Animated.Text style={[kanjiTextStyle, topStyle]}>鍛</Animated.Text>
        <Animated.Text style={[kanjiTextStyle, bottomStyle]}>錬</Animated.Text>
      </View>
      <Animated.View style={wordmarkStyle}>
        <TanrenWordmark size={56} />
      </Animated.View>
    </View>
  );
}
