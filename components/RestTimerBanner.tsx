import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Radius, Spacing } from '../constants/theme';

interface Props {
  endAt: number;
  onDone: () => void;
}

export function RestTimerBanner({ endAt, onDone }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.round((endAt - Date.now()) / 1000)));
  const player = useAudioPlayer(require('../assets/sounds/rest-timer-done.wav'));
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    const tick = () => {
      const r = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0 && !firedRef.current) {
        firedRef.current = true;
        player.seekTo(0);
        player.play();
        onDone();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt, onDone, player]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

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
        {t.restTimer.label}
      </ThemedText>
      <ThemedText variant="title2" weight="700" style={{ color: '#FFFFFF' }}>
        {mm}:{String(ss).padStart(2, '0')}
      </ThemedText>
      <View>
        <ThemedText variant="caption" style={{ color: '#FFFFFF' }}>
          {t.restTimer.tapToSkip}
        </ThemedText>
      </View>
    </Pressable>
  );
}
