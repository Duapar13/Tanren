import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { Radius } from '../constants/theme';

interface Props {
  progress: number; // 0-1
  height?: number;
  tintColor?: string;
}

export function ProgressBar({ progress, height = 10, tintColor }: Props) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const tint = tintColor ?? colors.accent;

  // Fills smoothly on first show and whenever the value changes.
  const filled = useSharedValue(0);
  useEffect(() => {
    filled.value = withTiming(clamped, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [clamped, filled]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${filled.value * 100}%` }));

  return (
    <View
      style={{
        height,
        borderRadius: Radius.pill,
        backgroundColor: colors.fillSecondary,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            // Never collapse to an invisible sliver — a non-zero value should always read as "started".
            minWidth: clamped > 0 ? height : 0,
            height: '100%',
            borderRadius: Radius.pill,
            backgroundColor: tint,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}
