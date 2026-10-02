import { useEffect, useState } from 'react';
import { Alert, Image, Keyboard, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Application from 'expo-application';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { Section } from '../../components/Section';
import { NavRow, ToggleRow } from '../../components/SettingRow';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { IconButton } from '../../components/IconButton';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { Radius, Spacing } from '../../constants/theme';
import { NutritionGoal } from '../../types';
import { API_URL } from '../../lib/api';
import { authErrorMessage } from '../../lib/authErrors';
import { registerForPushNotificationsAsync } from '../../hooks/usePushNotifications';
import { cmToDisplay, displayToCm } from '../../utils/units';
import { setPreference, usePreference, type ThemeMode } from '../../lib/preferences';
import { requestReminderPermission } from '../../lib/reminders';

const REST_DURATIONS = [60, 90, 120, 180];

// Lundi en premier pour matcher WeekStrip ; dow = index JS (0=dimanche..6=samedi).
const WEEKDAY_DOWS = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS: Record<string, string[]> = {
  fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  it: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
  es: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
};

export default function ProfilScreen() {
  const { exercises, workoutTemplates } = useData();
  const { user, updateProfile, uploadAvatar, logout, deleteAccount } = useAuth();
  const { colors } = useTheme();
  const { t, lang } = useTranslation();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const themeMode = usePreference('themeMode');
  const showLeaderboard = usePreference('showLeaderboard');
  const hapticsEnabled = usePreference('hapticsEnabled');
  const reminderEnabled = usePreference('reminderEnabled');
  const reminderHour = usePreference('reminderHour');
  const reminderMinute = usePreference('reminderMinute');
  const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
    { label: t.profil.themeSystem, value: 'system' },
    { label: t.profil.themeLight, value: 'light' },
    { label: t.profil.themeDark, value: 'dark' },
  ];

  const WEIGHT_UNIT_OPTIONS: { label: string; value: 'kg' | 'lbs' }[] = [
    { label: 'kg', value: 'kg' },
    { label: 'lbs', value: 'lbs' },
  ];
  const LENGTH_UNIT_OPTIONS: { label: string; value: 'cm' | 'in' }[] = [
    { label: 'cm', value: 'cm' },
    { label: 'in', value: 'in' },
  ];
  // Short forms so all three fit on one line in the segmented control.
  const GOAL_OPTIONS: { label: string; value: NutritionGoal }[] = [
    { label: t.onboarding.goalBulk, value: 'bulk' },
    { label: t.onboarding.goalCut, value: 'cut' },
    { label: t.onboarding.goalMaintain, value: 'maintain' },
  ];
  const WEEKDAYS = WEEKDAY_DOWS.map((dow, i) => ({ dow, label: WEEKDAY_LABELS[lang][i] }));

  const handleLogout = () => {
    Alert.alert(t.profil.logoutConfirmTitle, undefined, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.profil.logout, style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t.profil.deleteAccountConfirmTitle, t.profil.deleteAccountConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.profil.deleteAccount,
        style: 'destructive',
        onPress: async () => {
          setDeletingAccount(true);
          try {
            await deleteAccount();
          } catch {
            Alert.alert(t.profil.deleteAccountConfirmTitle, t.profil.deleteAccountError);
          } finally {
            setDeletingAccount(false);
          }
        },
      },
    ]);
  };

  const [editingAccount, setEditingAccount] = useState(false);
  const [editUsername, setEditUsername] = useState(user?.username ?? '');
  const [editEmail, setEditEmail] = useState(user?.email ?? '');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const startEditAccount = () => {
    setEditUsername(user?.username ?? '');
    setEditEmail(user?.email ?? '');
    setAccountError(null);
    setEditingAccount(true);
  };

  const saveAccountEdits = async () => {
    Keyboard.dismiss();
    setAccountError(null);
    setSavingAccount(true);
    try {
      const patch: { username?: string; email?: string } = {};
      if (editUsername.trim() !== user?.username) patch.username = editUsername.trim();
      if (editEmail.trim() !== user?.email) patch.email = editEmail.trim();
      if (Object.keys(patch).length > 0) await updateProfile(patch);
      setEditingAccount(false);
    } catch (err) {
      setAccountError(authErrorMessage(err));
    } finally {
      setSavingAccount(false);
    }
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.common.permissionRequired, t.profil.photoPermissionBody);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    try {
      await uploadAvatar(result.assets[0].uri);
    } catch (err) {
      Alert.alert('Photo de profil', authErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const [togglingPush, setTogglingPush] = useState(false);

  const handleToggleReminder = async (enabled: boolean) => {
    if (enabled && !(await requestReminderPermission())) {
      Alert.alert(t.common.permissionRequired, t.profil.reminderDenied);
      return;
    }
    setPreference('reminderEnabled', enabled);
    // The local reminder replaces the server's fixed 19:00 nudge so the user isn't pinged twice.
    updateProfile({ dailyReminderEnabled: !enabled }).catch(() => {});
  };

  const shiftReminder = (deltaMinutes: number) => {
    const total = (reminderHour * 60 + reminderMinute + deltaMinutes + 24 * 60) % (24 * 60);
    setPreference('reminderHour', Math.floor(total / 60));
    setPreference('reminderMinute', total % 60);
  };

  const handleTogglePush = async (enabled: boolean) => {
    setTogglingPush(true);
    try {
      if (enabled) {
        const token = await registerForPushNotificationsAsync();
        if (!token) {
          Alert.alert(t.common.permissionRequired, t.profil.pushPermissionBody);
          return;
        }
        await updateProfile({ pushToken: token });
      } else {
        await updateProfile({ pushToken: null });
      }
    } catch {
      Alert.alert(t.profil.notifications, t.profil.notificationsUpdateError);
    } finally {
      setTogglingPush(false);
    }
  };

  const lengthUnit = user?.lengthUnit ?? 'cm';
  const weightUnit = user?.weightUnit ?? 'kg';

  const [heightInput, setHeightInput] = useState(
    user?.heightCm ? String(Math.round(cmToDisplay(user.heightCm, lengthUnit) * 10) / 10) : ''
  );
  useEffect(() => {
    setHeightInput(
      user?.heightCm ? String(Math.round(cmToDisplay(user.heightCm, lengthUnit) * 10) / 10) : ''
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.heightCm, lengthUnit]);

  const saveHeight = () => {
    Keyboard.dismiss();
    const value = parseFloat(heightInput.replace(',', '.'));
    if (Number.isFinite(value) && value > 0) updateProfile({ heightCm: displayToCm(value, lengthUnit) });
  };

  const toggleTrainingDay = (dow: number) => {
    const current = user?.trainingDays ?? [];
    const next = current.includes(dow) ? current.filter((d) => d !== dow) : [...current, dow];
    updateProfile({ trainingDays: next });
  };

  const customExercises = exercises.filter((e) => e.isCustom && !e.deletedAt);

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader title={t.tabs.profile} mascot="friendly" />
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            gap: Spacing.xl,
            paddingBottom: Spacing.xxl * 2,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Section title={t.profil.account}>
            <Card style={{ gap: Spacing.md }}>
              <Pressable
                onPress={() => (editingAccount ? setEditingAccount(false) : startEditAccount())}
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}
              >
                <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
                  {user?.avatarUrl ? (
                    <Image
                      source={{ uri: `${API_URL}${user.avatarUrl}` }}
                      style={{ width: 64, height: 64, borderRadius: 32, opacity: uploadingAvatar ? 0.5 : 1 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: colors.accentSoft,
                        borderWidth: 2,
                        borderColor: colors.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: uploadingAvatar ? 0.5 : 1,
                      }}
                    >
                      <ThemedText variant="title2" weight="800" color="accent">
                        {(user?.displayName ?? user?.username ?? '?').charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                  )}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colors.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: colors.card,
                    }}
                  >
                    <Ionicons name="camera" size={12} color={colors.onAccent} />
                  </View>
                </Pressable>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText variant="headline" numberOfLines={1}>
                    {user?.displayName ?? user?.username}
                  </ThemedText>
                  <ThemedText variant="caption" color="tertiary" numberOfLines={1} ellipsizeMode="tail">
                    {user?.email}
                  </ThemedText>
                </View>
                <Ionicons
                  name={editingAccount ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textTertiary}
                />
              </Pressable>

              {editingAccount ? (
                <View style={{ gap: Spacing.sm }}>
                  <View style={{ gap: 4 }}>
                    <ThemedText variant="caption" weight="600" color="secondary">
                      {t.profil.username}
                    </ThemedText>
                    <Input value={editUsername} onChangeText={setEditUsername} autoCapitalize="none" autoCorrect={false} />
                  </View>
                  <View style={{ gap: 4 }}>
                    <ThemedText variant="caption" weight="600" color="secondary">
                      {t.profil.email}
                    </ThemedText>
                    <Input
                      value={editEmail}
                      onChangeText={setEditEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                    />
                  </View>
                  {accountError && (
                    <ThemedText variant="footnote" style={{ color: colors.negative }}>
                      {accountError}
                    </ThemedText>
                  )}
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <Button
                      title={savingAccount ? t.common.saving : t.common.save}
                      onPress={saveAccountEdits}
                      disabled={savingAccount}
                      style={{ flex: 1 }}
                    />
                    <IconButton name="close" onPress={() => setEditingAccount(false)} disabled={savingAccount} />
                  </View>
                </View>
              ) : (
                <Button title={t.profil.logout} variant="destructive" onPress={handleLogout} />
              )}
            </Card>
          </Section>

          <Section title={t.profil.appearance}>
            <Card style={{ gap: Spacing.lg }}>
              <View style={{ gap: 8 }}>
                <ThemedText variant="subhead" weight="600">
                  {t.profil.theme}
                </ThemedText>
                <SegmentedControl options={THEME_OPTIONS} value={themeMode} onChange={(m) => setPreference('themeMode', m)} />
              </View>
              <ToggleRow
                label={t.profil.showLeaderboard}
                hint={t.profil.showLeaderboardHint}
                value={showLeaderboard}
                onValueChange={(v) => setPreference('showLeaderboard', v)}
              />
              <ToggleRow
                label={t.profil.haptics}
                hint={t.profil.hapticsHint}
                value={hapticsEnabled}
                onValueChange={(v) => setPreference('hapticsEnabled', v)}
              />
            </Card>
          </Section>

          <Section title={t.profil.bodyAndGoal}>
            <Card style={{ gap: Spacing.lg }}>
              <View style={{ gap: 4 }}>
                <ThemedText variant="caption" weight="600" color="secondary">
                  {t.profil.height} ({lengthUnit})
                </ThemedText>
                <Input
                  keyboardType="decimal-pad"
                  value={heightInput}
                  onChangeText={setHeightInput}
                  onSubmitEditing={saveHeight}
                  onEndEditing={saveHeight}
                  returnKeyType="done"
                  placeholder={lengthUnit === 'cm' ? 'ex. 178' : 'ex. 70'}
                />
              </View>
              <View style={{ gap: 8 }}>
                <ThemedText variant="caption" weight="600" color="secondary">
                  {t.profil.goal}
                </ThemedText>
                <SegmentedControl
                  options={GOAL_OPTIONS}
                  value={user?.goal ?? 'maintain'}
                  onChange={(goal) => updateProfile({ goal })}
                />
              </View>
            </Card>
          </Section>

          <Section title={t.profil.units}>
            <Card style={{ gap: Spacing.lg }}>
              <View style={{ gap: 8 }}>
                <ThemedText variant="caption" weight="600" color="secondary">
                  {t.profil.weight}
                </ThemedText>
                <SegmentedControl
                  options={WEIGHT_UNIT_OPTIONS}
                  value={weightUnit}
                  onChange={(weightUnit) => updateProfile({ weightUnit })}
                />
              </View>
              <View style={{ gap: 8 }}>
                <ThemedText variant="caption" weight="600" color="secondary">
                  {t.profil.lengthUnits}
                </ThemedText>
                <SegmentedControl
                  options={LENGTH_UNIT_OPTIONS}
                  value={lengthUnit}
                  onChange={(lengthUnit) => updateProfile({ lengthUnit })}
                />
              </View>
            </Card>
          </Section>

          <Section title={t.profil.program}>
            <Card style={{ gap: Spacing.md }}>
              <ThemedText variant="caption" weight="600" color="secondary">
                {t.profil.trainingDays}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {WEEKDAYS.map(({ label, dow }) => {
                  const selected = (user?.trainingDays ?? []).includes(dow);
                  return (
                    <Pressable
                      key={dow}
                      onPress={() => toggleTrainingDay(dow)}
                      style={{
                        flex: 1,
                        aspectRatio: 1,
                        borderRadius: 999,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? colors.accent : colors.fill,
                        borderWidth: 1,
                        borderColor: selected ? colors.accent : colors.border,
                      }}
                    >
                      <ThemedText
                        variant="subhead"
                        weight="700"
                        style={{ color: selected ? colors.onAccent : colors.textSecondary }}
                      >
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </Section>

          <Section title={t.profil.session}>
            <Card style={{ gap: Spacing.lg }}>
              <ToggleRow
                label={t.profil.restTimer}
                hint={t.profil.restTimerHint}
                value={user?.restTimerEnabled ?? false}
                onValueChange={(v) => updateProfile({ restTimerEnabled: v })}
              />

              {user?.restTimerEnabled && (
                <SegmentedControl
                  options={[
                    { label: t.profil.restTimerModeCountdown, value: 'countdown' as const },
                    { label: t.profil.restTimerModeStopwatch, value: 'stopwatch' as const },
                  ]}
                  value={user?.restTimerMode ?? 'countdown'}
                  onChange={(v) => updateProfile({ restTimerMode: v })}
                />
              )}

              {user?.restTimerEnabled && user.restTimerMode !== 'stopwatch' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {REST_DURATIONS.map((d) => {
                    const selected = user.restTimerSeconds === d;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => updateProfile({ restTimerSeconds: d })}
                        style={{
                          flex: 1,
                          minHeight: 40,
                          justifyContent: 'center',
                          borderRadius: 999,
                          alignItems: 'center',
                          backgroundColor: selected ? colors.accent : colors.fill,
                          borderWidth: 1,
                          borderColor: selected ? colors.accent : colors.border,
                        }}
                      >
                        <ThemedText
                          variant="footnote"
                          weight="700"
                          style={{ color: selected ? colors.onAccent : colors.textSecondary }}
                        >
                          {d}s
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <ToggleRow
                label={t.common.rpe}
                hint={t.profil.rpeHint}
                value={user?.rpeEnabled ?? false}
                onValueChange={(v) => updateProfile({ rpeEnabled: v })}
              />
            </Card>
          </Section>

          <Section title={t.profil.measurements}>
            <Card>
              <ToggleRow
                label={t.profil.measurementsToggle}
                hint={t.profil.measurementsToggleHint}
                value={user?.measurementsEnabled ?? false}
                onValueChange={(v) => updateProfile({ measurementsEnabled: v })}
              />
            </Card>
          </Section>

          <Section title={t.profil.notifications}>
            <Card style={{ gap: Spacing.lg }}>
              <ToggleRow
                label={t.profil.pushNotifications}
                hint={t.profil.pushNotificationsHint}
                value={user?.pushNotificationsEnabled ?? false}
                onValueChange={handleTogglePush}
                disabled={togglingPush}
              />
              <ToggleRow
                label={t.profil.reminder}
                hint={t.profil.reminderHint}
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
              />
              {reminderEnabled && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
                  <ThemedText variant="subhead" weight="600">
                    {t.profil.reminderTime}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <IconButton name="remove" onPress={() => shiftReminder(-30)} />
                    <ThemedText variant="title3" weight="800" style={{ minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
                      {String(reminderHour).padStart(2, '0')}:{String(reminderMinute).padStart(2, '0')}
                    </ThemedText>
                    <IconButton name="add" onPress={() => shiftReminder(30)} />
                  </View>
                </View>
              )}
            </Card>
          </Section>

          <View style={{ gap: Spacing.sm }}>
            <NavRow
              icon="barbell-outline"
              label={t.profil.exerciseLibrary}
              hint={t.seance.exerciseCount(customExercises.length)}
              onPress={() => router.push('/exercise-library')}
            />
            <NavRow
              icon="list-outline"
              label={t.profil.workoutTemplates}
              hint={t.profil.workoutTemplatesCount(workoutTemplates.length)}
              onPress={() => router.push('/workout-templates')}
            />
            <NavRow icon="people-outline" label={t.profil.friends} onPress={() => router.push('/friends')} />
            <NavRow icon="heart" label={t.screenTitles.support} onPress={() => router.push('/support')} accent />
          </View>

          <Section title={t.profil.dangerZone}>
            <Pressable
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
              style={{
                minHeight: 50,
                justifyContent: 'center',
                paddingHorizontal: Spacing.lg,
                borderRadius: Radius.md,
                backgroundColor: colors.negative + '14',
                opacity: deletingAccount ? 0.5 : 1,
              }}
            >
              <ThemedText variant="subhead" weight="700" style={{ color: colors.negative }}>
                {t.profil.deleteAccount}
              </ThemedText>
            </Pressable>
          </Section>

          <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
            Ningyma {Application.nativeApplicationVersion} ({Application.nativeBuildVersion}) ·{' '}
            {Platform.OS === 'ios' ? 'iOS' : 'Android'}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
