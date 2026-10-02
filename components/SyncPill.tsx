import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Popup } from './Popup';
import { Button } from './Button';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { requestSync } from '../lib/syncBus';
import { useSyncStatus } from '../lib/syncStatus';
import { Spacing } from '../constants/theme';

/** Small cloud in the header: green = all synced, orange = offline or changes waiting. Tap for details. */
export function SyncPill() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const status = useSyncStatus();
  const [open, setOpen] = useState(false);

  const offline = !status.online;
  const waiting = status.pending > 0;

  const icon: keyof typeof Ionicons.glyphMap = status.syncing
    ? 'sync'
    : offline
      ? 'cloud-offline-outline'
      : waiting
        ? 'cloud-upload-outline'
        : 'cloud-done-outline';
  const tint = status.syncing ? colors.accent : offline || waiting ? colors.warning : colors.positive;
  const headline = status.syncing
    ? t.sync.syncing
    : offline
      ? t.sync.offline
      : waiting
        ? t.sync.pending(status.pending)
        : t.sync.ok;

  const lastSyncLabel = (() => {
    if (!status.lastSyncAt) return t.sync.never;
    const minutes = Math.floor((Date.now() - status.lastSyncAt) / 60000);
    if (minutes < 1) return t.sync.justNow;
    if (minutes < 60) return t.sync.minutesAgo(minutes);
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t.sync.hoursAgo(hours);
    return t.sync.daysAgo(Math.floor(hours / 24));
  })();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: tint + '1F',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={18} color={tint} />
        {waiting && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              paddingHorizontal: 4,
              borderRadius: 8,
              backgroundColor: colors.warning,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.background }}>
              {status.pending > 99 ? '99+' : status.pending}
            </Text>
          </View>
        )}
      </Pressable>

      <Popup title={t.sync.title} visible={open} onClose={() => setOpen(false)}>
        <View style={{ gap: Spacing.sm, alignItems: 'center' }}>
          <Ionicons name={icon} size={40} color={tint} />
          <ThemedText variant="headline" style={{ color: tint, textAlign: 'center' }}>
            {headline}
          </ThemedText>
          {offline && (
            <ThemedText variant="subhead" color="secondary" style={{ textAlign: 'center' }}>
              {t.sync.offlineBody}
            </ThemedText>
          )}
          <ThemedText variant="footnote" color="tertiary">
            {t.sync.lastSync} : {lastSyncLabel}
          </ThemedText>
          <Button
            title={t.sync.syncNow}
            variant="tonal"
            onPress={requestSync}
            disabled={offline || status.syncing}
            style={{ alignSelf: 'stretch', marginTop: Spacing.xs }}
          />
        </View>
      </Popup>
    </>
  );
}
