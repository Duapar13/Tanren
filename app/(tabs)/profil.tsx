import { useEffect, useState } from 'react';
import { Alert, Image, Keyboard, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { IconButton } from '../../components/IconButton';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { Spacing } from '../../constants/theme';
import { Exercise, NutritionGoal } from '../../types';
import { API_URL } from '../../lib/api';
import { authErrorMessage } from '../../lib/authErrors';
import { registerForPushNotificationsAsync } from '../../hooks/usePushNotifications';
import { cmToDisplay, displayToCm } from '../../utils/units';

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
  const { exercises, addExercise, updateExercise, removeExercise } = useData();
  const { user, updateProfile, uploadAvatar, logout } = useAuth();
  const { colors } = useTheme();
  const { t, lang } = useTranslation();

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

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'upper' | 'lower'>('upper');

  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'upper' | 'lower'>('upper');

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

  const handleAddExercise = async () => {
    if (!name.trim()) return;
    await addExercise({
      name: name.trim(),
      category,
      muscleGroup: category === 'upper' ? 'pecs' : 'quadriceps',
      isCustom: true,
    });
    setName('');
    setShowAddExercise(false);
  };

  const handleDeleteExercise = (id: number, exName: string) => {
    Alert.alert(t.profil.deleteExerciseConfirmTitle, exName, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => removeExercise(id) },
    ]);
  };

  const startEditExercise = (ex: Exercise) => {
    setEditingExerciseId(ex.id);
    setEditName(ex.name);
    setEditCategory(ex.category);
  };

  const saveEditExercise = async () => {
    if (editingExerciseId === null || !editName.trim()) return;
    Keyboard.dismiss();
    await updateExercise(editingExerciseId, { name: editName.trim(), category: editCategory });
    setEditingExerciseId(null);
  };

  const customExercises = exercises.filter((e) => e.isCustom);

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader mascot="friendly" />
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            gap: Spacing.lg,
            paddingBottom: Spacing.xxl,
          }}
        >
          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.profil.account}
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <Pressable
                onPress={() => (editingAccount ? setEditingAccount(false) : startEditAccount())}
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}
              >
                <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
                  {user?.avatarUrl ? (
                    <Image
                      source={{ uri: `${API_URL}${user.avatarUrl}` }}
                      style={{ width: 56, height: 56, borderRadius: 28, opacity: uploadingAvatar ? 0.5 : 1 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: colors.fill,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: uploadingAvatar ? 0.5 : 1,
                      }}
                    >
                      <ThemedText variant="title2" weight="700" color="secondary">
                        {(user?.displayName ?? user?.username ?? '?').charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                  )}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: colors.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: colors.card,
                    }}
                  >
                    <Ionicons name="camera" size={12} color="#FFFFFF" />
                  </View>
                </Pressable>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText variant="subhead" weight="600" numberOfLines={1}>
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
                  <View>
                    <ThemedText variant="caption" color="tertiary">
                      {t.profil.username}
                    </ThemedText>
                    <Input value={editUsername} onChangeText={setEditUsername} autoCapitalize="none" autoCorrect={false} />
                  </View>
                  <View>
                    <ThemedText variant="caption" color="tertiary">
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
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.profil.bodyAndGoal}
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View>
                <ThemedText variant="caption" color="tertiary">
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
              <View>
                <ThemedText variant="caption" color="tertiary" style={{ marginBottom: 6 }}>
                  {t.profil.goal}
                </ThemedText>
                <SegmentedControl
                  options={GOAL_OPTIONS}
                  value={user?.goal ?? 'maintain'}
                  onChange={(goal) => updateProfile({ goal })}
                />
              </View>
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.profil.units}
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View>
                <ThemedText variant="caption" color="tertiary" style={{ marginBottom: 6 }}>
                  {t.profil.weight}
                </ThemedText>
                <SegmentedControl
                  options={WEIGHT_UNIT_OPTIONS}
                  value={weightUnit}
                  onChange={(weightUnit) => updateProfile({ weightUnit })}
                />
              </View>
              <View>
                <ThemedText variant="caption" color="tertiary" style={{ marginBottom: 6 }}>
                  {t.profil.lengthUnits}
                </ThemedText>
                <SegmentedControl
                  options={LENGTH_UNIT_OPTIONS}
                  value={lengthUnit}
                  onChange={(lengthUnit) => updateProfile({ lengthUnit })}
                />
              </View>
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.profil.program}
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View>
                <ThemedText variant="caption" color="tertiary" style={{ marginBottom: 6 }}>
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
                        }}
                      >
                        <ThemedText
                          variant="subhead"
                          weight="600"
                          style={{ color: selected ? '#FFFFFF' : colors.text }}
                        >
                          {label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.profil.session}
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead">{t.profil.restTimer}</ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    {t.profil.restTimerHint}
                  </ThemedText>
                </View>
                <Switch
                  value={user?.restTimerEnabled ?? false}
                  onValueChange={(v) => updateProfile({ restTimerEnabled: v })}
                  trackColor={{ true: colors.accent }}
                />
              </View>

              {user?.restTimerEnabled && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {REST_DURATIONS.map((d) => {
                    const selected = user.restTimerSeconds === d;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => updateProfile({ restTimerSeconds: d })}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 999,
                          alignItems: 'center',
                          backgroundColor: selected ? colors.accent : colors.fill,
                        }}
                      >
                        <ThemedText
                          variant="footnote"
                          weight="600"
                          style={{ color: selected ? '#FFFFFF' : colors.text }}
                        >
                          {d}s
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead">{t.common.rpe}</ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    {t.profil.rpeHint}
                  </ThemedText>
                </View>
                <Switch
                  value={user?.rpeEnabled ?? false}
                  onValueChange={(v) => updateProfile({ rpeEnabled: v })}
                  trackColor={{ true: colors.accent }}
                />
              </View>
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.profil.measurements}
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead">{t.profil.measurementsToggle}</ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    {t.profil.measurementsToggleHint}
                  </ThemedText>
                </View>
                <Switch
                  value={user?.measurementsEnabled ?? false}
                  onValueChange={(v) => updateProfile({ measurementsEnabled: v })}
                  trackColor={{ true: colors.accent }}
                />
              </View>
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.profil.notifications}
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead">{t.profil.pushNotifications}</ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    {t.profil.pushNotificationsHint}
                  </ThemedText>
                </View>
                <Switch
                  value={user?.pushNotificationsEnabled ?? false}
                  onValueChange={handleTogglePush}
                  disabled={togglingPush}
                  trackColor={{ true: colors.accent }}
                />
              </View>
            </Card>
          </View>

          <View style={{ gap: Spacing.sm }}>
            <ThemedText variant="headline">{t.profil.exerciseLibrary}</ThemedText>

            {showAddExercise ? (
              <Card style={{ gap: Spacing.sm }}>
                <Input placeholder={t.profil.exerciseNamePlaceholder} value={name} onChangeText={setName} />
                <SegmentedControl
                  options={[
                    { label: t.common.upperBody, value: 'upper' as const },
                    { label: t.common.lowerBody, value: 'lower' as const },
                  ]}
                  value={category}
                  onChange={setCategory}
                />
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <Button title={t.common.add} onPress={handleAddExercise} style={{ flex: 1 }} />
                  <IconButton name="close" onPress={() => setShowAddExercise(false)} />
                </View>
              </Card>
            ) : (
              <Button title={t.seance.addExercise} onPress={() => setShowAddExercise(true)} />
            )}

            {customExercises.map((ex) =>
              editingExerciseId === ex.id ? (
                <Card key={ex.id} style={{ gap: Spacing.sm }}>
                  <Input value={editName} onChangeText={setEditName} />
                  <SegmentedControl
                    options={[
                      { label: t.common.upperBody, value: 'upper' as const },
                      { label: t.common.lowerBody, value: 'lower' as const },
                    ]}
                    value={editCategory}
                    onChange={setEditCategory}
                  />
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <Button title={t.common.save} onPress={saveEditExercise} style={{ flex: 1 }} />
                    <IconButton name="close" onPress={() => setEditingExerciseId(null)} />
                  </View>
                </Card>
              ) : (
                <Card
                  key={ex.id}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Pressable onPress={() => startEditExercise(ex)} style={{ flex: 1 }}>
                    <ThemedText variant="subhead" weight="600">
                      {ex.name}
                    </ThemedText>
                    <ThemedText variant="caption" color="tertiary">
                      {ex.category === 'upper' ? t.common.upperBody : t.common.lowerBody}
                    </ThemedText>
                  </Pressable>
                  <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                    <IconButton name="pencil-outline" size={18} onPress={() => startEditExercise(ex)} />
                    <IconButton
                      name="trash-outline"
                      variant="destructive"
                      size={18}
                      onPress={() => handleDeleteExercise(ex.id, ex.name)}
                    />
                  </View>
                </Card>
              )
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
