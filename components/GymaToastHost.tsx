import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { NinjaMascot } from './NinjaMascot';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { hideToast, showToast, useToast } from '../lib/toast';
import { useSyncStatus } from '../lib/syncStatus';
import { Radius, Spacing } from '../constants/theme';

const VISIBLE_MS = 2600;

/** Renders the current toast: a small pill slid in from the top with Gyma reacting. Also announces
 * (once) when changes made offline have finished syncing. */
export function GymaToastHost() {
  const { colors, scheme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const sync = useSyncStatus();

  const hadPending = useRef(false);
  useEffect(() => {
    if (sync.pending > 0) {
      hadPending.current = true;
    } else if (hadPending.current && sync.online && !sync.syncing) {
      hadPending.current = false;
      showToast(t.sync.ok, 'happy');
    }
  }, [sync.pending, sync.online, sync.syncing, t]);

  useEffect(() => {
    if (!toast) return;
    const id = toast.id;
    const timer = setTimeout(() => hideToast(id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + Spacing.sm, left: 0, right: 0, alignItems: 'center', zIndex: 100 }}>
      <Animated.View
        key={toast.id}
        entering={SlideInUp.springify().damping(14)}
        exiting={SlideOutUp.duration(220)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          maxWidth: '88%',
          paddingLeft: Spacing.sm,
          paddingRight: Spacing.lg,
          paddingVertical: 6,
          borderRadius: Radius.pill,
          backgroundColor: colors.cardElevated,
          borderWidth: 1.5,
          borderColor: colors.accent,
          shadowColor: scheme === 'dark' ? colors.accent : colors.shadow,
          shadowOpacity: scheme === 'dark' ? 0.4 : 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }}
      >
        <NinjaMascot size={44} reaction={toast.reaction} animated={false} />
        <ThemedText variant="subhead" weight="700" numberOfLines={2} style={{ flexShrink: 1 }}>
          {toast.message}
        </ThemedText>
      </Animated.View>
    </View>
  );
}
