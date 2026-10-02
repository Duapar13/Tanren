import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { RankEmblem } from './RankEmblem';
import type { RankName } from '../utils/ranking';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Radius, Spacing } from '../constants/theme';

interface Props {
  visible: boolean;
  rank: RankName;
  rankLabel: string;
  rankColor: string;
  bonusPoints: number;
  onDone: () => void;
}

/** Plays once, the first time the app notices placement finished — a LoL/Valorant-style
 * "mystery rank until your 10 placement games are done" reveal, rather than a silent stat change
 * the player has to go notice themselves. See utils/placementReveal.ts for the one-time gating. */
export function PlacementReveal({ visible, rank, rankLabel, rankColor, bonusPoints, onDone }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);

  const mysteryScale = useSharedValue(1);
  const mysteryOpacity = useSharedValue(1);
  const rankScale = useSharedValue(0);
  const rankOpacity = useSharedValue(0);
  const rankRotate = useSharedValue(-8);

  useEffect(() => {
    if (!visible) return;
    setRevealed(false);
    mysteryScale.value = 1;
    mysteryOpacity.value = 1;
    rankScale.value = 0;
    rankOpacity.value = 0;
    rankRotate.value = -8;
    mysteryScale.value = withRepeat(withSequence(withTiming(1.08, { duration: 650 }), withTiming(1, { duration: 650 })), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleReveal = () => {
    setRevealed(true);
    mysteryOpacity.value = withTiming(0, { duration: 220 });
    rankOpacity.value = withTiming(1, { duration: 320 });
    rankScale.value = withSequence(withSpring(1.15, { damping: 6 }), withSpring(1, { damping: 8 }));
    rankRotate.value = withSequence(withTiming(8, { duration: 150 }), withSpring(0));
  };

  const mysteryStyle = useAnimatedStyle(() => ({
    opacity: mysteryOpacity.value,
    transform: [{ scale: mysteryScale.value }],
  }));
  const rankStyle = useAnimatedStyle(() => ({
    opacity: rankOpacity.value,
    transform: [{ scale: rankScale.value }, { rotateZ: `${rankRotate.value}deg` }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={revealed ? onDone : undefined}>
      <View style={{ flex: 1, backgroundColor: '#000000F2', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
        <ThemedText variant="title3" weight="700" color="secondary" style={{ marginBottom: Spacing.xl, textAlign: 'center' }}>
          {revealed ? t.rang.placementRevealedTitle : t.rang.placementRevealTitle}
        </ThemedText>

        <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute' }, mysteryStyle]}>
            <RankEmblem rank={null} size={160} />
          </Animated.View>

          <Animated.View style={[{ position: 'absolute' }, rankStyle]}>
            <RankEmblem rank={rank} size={160} />
          </Animated.View>
        </View>

        {revealed ? (
          <View style={{ alignItems: 'center', marginTop: Spacing.xl, gap: Spacing.xs }}>
            <ThemedText variant="title1" weight="800" style={{ color: rankColor, textAlign: 'center' }}>
              {rankLabel}
            </ThemedText>
            {bonusPoints > 0 && (
              <ThemedText variant="subhead" color="secondary">
                {t.rang.placementBonus(bonusPoints)}
              </ThemedText>
            )}
          </View>
        ) : (
          <ThemedText variant="subhead" color="tertiary" style={{ marginTop: Spacing.xl, textAlign: 'center' }}>
            {t.rang.placementRevealHint}
          </ThemedText>
        )}

        <View style={{ width: '100%', marginTop: Spacing.xxl }}>
          {revealed ? (
            <Button title={t.common.continue} onPress={onDone} />
          ) : (
            <Pressable
              onPress={handleReveal}
              style={{
                backgroundColor: colors.accent,
                borderRadius: Radius.md,
                minHeight: 50,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ThemedText variant="subhead" weight="700" style={{ color: colors.onAccent }}>
                {t.rang.placementRevealButton}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
