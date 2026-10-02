import { useEffect, useState } from 'react';
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

interface Props {
  pose?: GymaPose;
  reaction?: NinjaReaction;
  /** Width in px; the height follows the pose's proportions. */
  size?: number;
  /** Idle life: gentle breathing/bounce and an occasional blink. Off for tiny or captured spots. */
  animated?: boolean;
  /** Pops in with a spring when it first appears. */
  entrance?: boolean;
}

/** Gyma with a bit of life. Pure presentation — all the drawing is in GymaFigure. */
export function Gyma({ pose = 'idle', reaction = 'default', size = 120, animated = false, entrance = false }: Props) {
  const [blink, setBlink] = useState(false);
  const bob = useSharedValue(0);
  const pop = useSharedValue(entrance ? 0 : 1);

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

  const style = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ translateY: bob.value }, { scale: 0.8 + 0.2 * pop.value }],
  }));

  return (
    <Animated.View style={style}>
      <GymaFigure pose={pose} reaction={reaction} blink={blink} width={size} />
    </Animated.View>
  );
}
