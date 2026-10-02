import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GymaFigure, type GymaPose, type NinjaReaction } from './GymaFigure';
import { haptics } from '../../lib/haptics';

interface Props {
  pose?: GymaPose;
  reaction?: NinjaReaction;
  /** Width in px; the height follows the pose's proportions. */
  size?: number;
  /** Idle life: gentle breathing/bounce and an occasional blink. Off for tiny or captured spots. */
  animated?: boolean;
  /** Pops in with a spring when it first appears. */
  entrance?: boolean;
  /** Tapping Gyma makes him hop and grin. */
  interactive?: boolean;
  /** Change this value to make Gyma hop (e.g. after a set is logged). The first value never hops. */
  hopKey?: number | string;
}

/** Gyma with a bit of life. Pure presentation — all the drawing is in GymaFigure. */
export function Gyma({
  pose = 'idle',
  reaction = 'default',
  size = 120,
  animated = false,
  entrance = false,
  interactive = false,
  hopKey,
}: Props) {
  const [blink, setBlink] = useState(false);
  const [override, setOverride] = useState<NinjaReaction | null>(null);
  const bob = useSharedValue(0);
  const hop = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const pop = useSharedValue(entrance ? 0 : 1);
  const overrideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!animated) return;
    const amplitude = pose === 'victory' ? 6 : pose === 'rest' ? 1.5 : 2.5;
    const duration = pose === 'victory' ? 420 : pose === 'rest' ? 2200 : 1400;
    bob.value = withRepeat(
      withSequence(
        withTiming(-amplitude, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
    return () => cancelAnimation(bob);
  }, [animated, pose, bob]);

  useEffect(() => {
    if (!animated) return;
    let timer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      timer = setTimeout(() => {
        setBlink(true);
        timer = setTimeout(() => {
          setBlink(false);
          scheduleBlink();
        }, 130);
      }, 2600 + Math.random() * 2800);
    };
    scheduleBlink();
    return () => clearTimeout(timer);
  }, [animated]);

  useEffect(() => {
    if (entrance) pop.value = withSpring(1, { damping: 9, stiffness: 140 });
  }, [entrance, pop]);

  const doHop = useCallback(() => {
    hop.value = withSequence(
      withTiming(-22, { duration: 150, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 5, stiffness: 220 })
    );
    wiggle.value = withSequence(
      withTiming(-7, { duration: 90 }),
      withTiming(7, { duration: 130 }),
      withTiming(0, { duration: 120 })
    );
  }, [hop, wiggle]);

  const lastHopKey = useRef(hopKey);
  useEffect(() => {
    if (hopKey === undefined || hopKey === lastHopKey.current) return;
    lastHopKey.current = hopKey;
    doHop();
  }, [hopKey, doHop]);

  useEffect(
    () => () => {
      if (overrideTimer.current) clearTimeout(overrideTimer.current);
    },
    []
  );

  const handlePress = () => {
    haptics.tap();
    doHop();
    setOverride('happy');
    if (overrideTimer.current) clearTimeout(overrideTimer.current);
    overrideTimer.current = setTimeout(() => setOverride(null), 1100);
  };

  const style = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [
      { translateY: bob.value + hop.value },
      { rotate: `${wiggle.value}deg` },
      { scale: 0.8 + 0.2 * pop.value },
    ],
  }));

  const figure = <GymaFigure pose={pose} reaction={override ?? reaction} blink={blink} width={size} />;

  return (
    <Animated.View style={style}>
      {interactive ? (
        <Pressable onPress={handlePress} hitSlop={8}>
          {figure}
        </Pressable>
      ) : (
        figure
      )}
    </Animated.View>
  );
}
