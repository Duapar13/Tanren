import { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { RANK_COLORS, RANK_ICON_IMAGES, type RankName } from '../utils/ranking';

interface Props {
  /** `null` renders the "?" mystery emblem shown while a returning player is still in placement. */
  rank: RankName | null;
  size?: number;
  /** Greyed-out silhouette for ranks not reached yet. */
  locked?: boolean;
  /** Slow glow-pulse, for the player's current rank. */
  pulse?: boolean;
}

/** The one place a rank is drawn — gradient disc, ring, soft coloured glow and the Ningyma
 * emblem on top — so the home card, rank hero, rank ladder and leaderboard all stay consistent. */
export function RankEmblem({ rank, size = 56, locked = false, pulse = false }: Props) {
  const { colors, scheme } = useTheme();
  const beat = useSharedValue(1);
  useEffect(() => {
    if (!pulse) return;
    beat.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, [pulse, beat]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: beat.value }] }));
  const ringWidth = size >= 80 ? 3 : 2;
  const iconSize = Math.round(size * 0.5);

  if (!rank) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringWidth,
          borderStyle: 'dashed',
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="help" size={iconSize} color={colors.accent} />
      </View>
    );
  }

  const color = locked ? colors.textTertiary : RANK_COLORS[rank];
  return (
    <Animated.View
      style={[pulseStyle, {
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: color,
        shadowOpacity: locked ? 0 : scheme === 'dark' ? 0.55 : 0.35,
        shadowRadius: size * 0.22,
        shadowOffset: { width: 0, height: 0 },
        opacity: locked ? 0.55 : 1,
      }]}
    >
      <LinearGradient
        colors={[color + '55', color + '12']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={{
          flex: 1,
          borderRadius: size / 2,
          borderWidth: ringWidth,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image source={RANK_ICON_IMAGES[rank]} style={{ width: iconSize, height: iconSize, tintColor: color }} />
      </LinearGradient>
    </Animated.View>
  );
}
