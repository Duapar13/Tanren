import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Radius, Spacing } from '../constants/theme';

interface Props {
  /** Countdown mode: the timestamp to count down to. Stopwatch mode: the timestamp counting
   * started at — reused as the same prop since both are just "the anchor instant" either way. */
  endAt: number;
  mode: 'countdown' | 'stopwatch';
  onDone: () => void;
}

export function RestTimerBanner({ endAt, mode, onDone }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isCountdown = mode === 'countdown';
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.round((isCountdown ? endAt - Date.now() : Date.now() - endAt) / 1000))
  );
  const player = useAudioPlayer(require('../assets/sounds/rest-timer-done.wav'));
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    const tick = () => {
      if (isCountdown) {
        const r = Math.max(0, Math.round((endAt - Date.now()) / 1000));
        setElapsed(r);
        if (r <= 0 && !firedRef.current) {
          firedRef.current = true;
          player.seekTo(0);
          player.play();
          onDone();
        }
      } else {
        setElapsed(Math.max(0, Math.round((Date.now() - endAt) / 1000)));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt, isCountdown, onDone, player]);

  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;

  return (
    <Pressable
      onPress={onDone}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.accent,
        borderRadius: Radius.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ThemedText variant="subhead" weight="600" style={{ color: '#FFFFFF' }}>
        {isCountdown ? t.restTimer.label : t.restTimer.chronoLabel}
      </ThemedText>
      <ThemedText variant="title2" weight="700" style={{ color: '#FFFFFF' }}>
        {mm}:{String(ss).padStart(2, '0')}
      </ThemedText>
      <View>
        <ThemedText variant="caption" style={{ color: '#FFFFFF' }}>
          {isCountdown ? t.restTimer.tapToSkip : t.restTimer.tapToStop}
        </ThemedText>
      </View>
    </Pressable>
  );
}
