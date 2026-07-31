import { useEffect, useState } from 'react';
import { Alert, Image, Keyboard, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { useAppleAuth } from '../../hooks/useAppleAuth';
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
import { Spacing } from '../../constants/theme';
import { Exercise, NutritionGoal } from '../../types';
import { API_URL, apiFetch } from '../../lib/api';
import { authErrorMessage } from '../../lib/authErrors';
import { registerForPushNotificationsAsync } from '../../hooks/usePushNotifications';

const REST_DURATIONS = [60, 90, 120, 180];
// Short forms so all three fit on one line in the segmented control (full names in utils/nutrition.ts's GOAL_LABELS).
const GOAL_OPTIONS: { label: string; value: NutritionGoal }[] = [
  { label: 'Masse', value: 'bulk' },
  { label: 'Sèche', value: 'cut' },
  { label: 'Maintien', value: 'maintain' },
];

// Lundi en premier pour matcher WeekStrip ; dow = index JS (0=dimanche..6=samedi).
const WEEKDAYS: { label: string; dow: number }[] = [
  { label: 'L', dow: 1 },
  { label: 'M', dow: 2 },
  { label: 'M', dow: 3 },
  { label: 'J', dow: 4 },
  { label: 'V', dow: 5 },
  { label: 'S', dow: 6 },
  { label: 'D', dow: 0 },
];

export default function ProfilScreen() {
  const { exercises, addExercise, updateExercise, removeExercise } = useData();
  const { user, updateProfile, uploadAvatar, linkGoogleIdToken, linkAppleIdToken, logout } = useAuth();
  const { colors } = useTheme();

  const [linkingProvider, setLinkingProvider] = useState<'google' | 'apple' | null>(null);

  const google = useGoogleAuth(async (idToken) => {
    try {
      await linkGoogleIdToken(idToken);
    } catch (err) {
      Alert.alert('Lier Google', authErrorMessage(err));
    } finally {
      setLinkingProvider(null);
    }
  });

  const apple = useAppleAuth(async (idToken) => {
    try {
      await linkAppleIdToken(idToken);
    } catch (err) {
      Alert.alert('Lier Apple', authErrorMessage(err));
    } finally {
      setLinkingProvider(null);
    }
  });

  const handleLinkGoogle = async () => {
    if (!google.isConfigured) {
      Alert.alert('Bientôt disponible', "La connexion Google n'est pas encore configurée.");
      return;
    }
    setLinkingProvider('google');
    try {
      await google.promptAsync();
    } catch (err) {
      Alert.alert('Lier Google', authErrorMessage(err));
      setLinkingProvider(null);
    }
  };

  const handleLinkApple = async () => {
    if (!apple.isConfigured) {
      Alert.alert('Indisponible', "La connexion Apple n'est pas disponible sur cet appareil.");
      return;
    }
    setLinkingProvider('apple');
    try {
      await apple.promptAsync();
    } catch (err) {
      Alert.alert('Lier Apple', authErrorMessage(err));
      setLinkingProvider(null);
    }
  };

  const handleLogout = () => {
    Alert.alert('Se déconnecter ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => logout() },
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
      Alert.alert('Permission requise', 'Autorise l’accès à tes photos pour changer ta photo de profil.');
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
  const [sendingTestPush, setSendingTestPush] = useState(false);

  const handleTogglePush = async (enabled: boolean) => {
    setTogglingPush(true);
    try {
      if (enabled) {
        const token = await registerForPushNotificationsAsync();
        if (!token) {
          Alert.alert(
            'Permission requise',
            'Autorise les notifications pour Tanren dans les réglages de ton téléphone.'
          );
          return;
        }
        await updateProfile({ pushToken: token });
      } else {
        await updateProfile({ pushToken: null });
      }
    } catch {
      Alert.alert('Notifications', 'Impossible de mettre à jour ce réglage pour le moment.');
    } finally {
      setTogglingPush(false);
    }
  };

  const handleTestPush = async () => {
    setSendingTestPush(true);
    try {
      await apiFetch('/notifications/test', { method: 'POST' });
      Alert.alert('Envoyée', 'Notification de test envoyée — elle devrait arriver dans quelques secondes.');
    } catch (err) {
      Alert.alert('Notifications', authErrorMessage(err));
    } finally {
      setSendingTestPush(false);
    }
  };

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'upper' | 'lower'>('upper');

  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'upper' | 'lower'>('upper');

  const [heightInput, setHeightInput] = useState(user?.heightCm ? String(user.heightCm) : '');
  useEffect(() => {
    setHeightInput(user?.heightCm ? String(user.heightCm) : '');
  }, [user?.heightCm]);

  const saveHeight = () => {
    Keyboard.dismiss();
    const cm = parseFloat(heightInput.replace(',', '.'));
    if (Number.isFinite(cm) && cm > 0) updateProfile({ heightCm: cm });
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
    Alert.alert('Supprimer l’exercice', exName, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeExercise(id) },
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
        <ScreenHeader />
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            gap: Spacing.lg,
            paddingBottom: Spacing.xxl,
          }}
        >
          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Compte
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
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
              </View>

              {editingAccount ? (
                <View style={{ gap: Spacing.sm }}>
                  <View>
                    <ThemedText variant="caption" color="tertiary">
                      Pseudo
                    </ThemedText>
                    <Input value={editUsername} onChangeText={setEditUsername} autoCapitalize="none" autoCorrect={false} />
                  </View>
                  <View>
                    <ThemedText variant="caption" color="tertiary">
                      Email
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
                      title={savingAccount ? 'Enregistrement…' : 'Enregistrer'}
                      onPress={saveAccountEdits}
                      disabled={savingAccount}
                      style={{ flex: 1 }}
                    />
                    <IconButton name="close" onPress={() => setEditingAccount(false)} disabled={savingAccount} />
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <Button title="Modifier pseudo / email" variant="plain" onPress={startEditAccount} style={{ flex: 1 }} />
                  <Pressable onPress={handleLogout}>
                    <ThemedText variant="footnote" weight="600" style={{ color: colors.negative }}>
                      Se déconnecter
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Comptes liés
            </ThemedText>
            <ThemedText variant="footnote" color="tertiary" style={{ marginBottom: Spacing.sm }}>
              Lie Google et/ou Apple à ce compte pour pouvoir te reconnecter avec, une fois le
              mot de passe classique retiré.
            </ThemedText>
            <Card style={{ gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Ionicons name="logo-google" size={18} color={colors.text} />
                  <ThemedText variant="subhead">Google</ThemedText>
                </View>
                {user?.googleLinked ? (
                  <ThemedText variant="footnote" weight="600" color="accent">
                    Lié ✓
                  </ThemedText>
                ) : (
                  <Pressable onPress={handleLinkGoogle} disabled={linkingProvider === 'google'}>
                    <ThemedText variant="footnote" weight="600" color="accent">
                      {linkingProvider === 'google' ? 'Liaison…' : 'Lier'}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Ionicons name="logo-apple" size={18} color={colors.text} />
                  <ThemedText variant="subhead">Apple</ThemedText>
                </View>
                {user?.appleLinked ? (
                  <ThemedText variant="footnote" weight="600" color="accent">
                    Lié ✓
                  </ThemedText>
                ) : (
                  <Pressable onPress={handleLinkApple} disabled={linkingProvider === 'apple'}>
                    <ThemedText variant="footnote" weight="600" color="accent">
                      {linkingProvider === 'apple' ? 'Liaison…' : 'Lier'}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Corps &amp; objectif
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View>
                <ThemedText variant="caption" color="tertiary">
                  Taille (cm)
                </ThemedText>
                <Input
                  keyboardType="decimal-pad"
                  value={heightInput}
                  onChangeText={setHeightInput}
                  onSubmitEditing={saveHeight}
                  onEndEditing={saveHeight}
                  returnKeyType="done"
                  placeholder="ex. 178"
                />
              </View>
              <View>
                <ThemedText variant="caption" color="tertiary" style={{ marginBottom: 6 }}>
                  Objectif
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
              Programme
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View>
                <ThemedText variant="caption" color="tertiary" style={{ marginBottom: 6 }}>
                  Jours d’entraînement
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
              Séance
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead">Timer de repos</ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    Décompte affiché après chaque série ajoutée
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
                  <ThemedText variant="subhead">RPE</ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    Champ d’intensité perçue (1-10) sur chaque série
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
              Mensurations
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead">Suivi des mensurations</ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    Bras, taille, torse, cuisses — affiche le suivi dans Nutrition et compte dans les points de rang
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
              Notifications
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead">Notifications push</ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    Rappels de séance et félicitations de série en cours
                  </ThemedText>
                </View>
                <Switch
                  value={user?.pushNotificationsEnabled ?? false}
                  onValueChange={handleTogglePush}
                  disabled={togglingPush}
                  trackColor={{ true: colors.accent }}
                />
              </View>
              {user?.pushNotificationsEnabled && (
                <Button
                  title={sendingTestPush ? 'Envoi…' : 'Envoyer une notification test'}
                  variant="plain"
                  onPress={handleTestPush}
                  disabled={sendingTestPush}
                />
              )}
            </Card>
          </View>

          <View style={{ gap: Spacing.sm }}>
            <ThemedText variant="headline">Bibliothèque d’exercices</ThemedText>

            {showAddExercise ? (
              <Card style={{ gap: Spacing.sm }}>
                <Input placeholder="Nom de l’exercice" value={name} onChangeText={setName} />
                <SegmentedControl
                  options={[
                    { label: 'Haut du corps', value: 'upper' as const },
                    { label: 'Bas du corps', value: 'lower' as const },
                  ]}
                  value={category}
                  onChange={setCategory}
                />
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <Button title="Ajouter" onPress={handleAddExercise} style={{ flex: 1 }} />
                  <IconButton name="close" onPress={() => setShowAddExercise(false)} />
                </View>
              </Card>
            ) : (
              <Button title="Ajouter un exercice" onPress={() => setShowAddExercise(true)} />
            )}

            {customExercises.map((ex) =>
              editingExerciseId === ex.id ? (
                <Card key={ex.id} style={{ gap: Spacing.sm }}>
                  <Input value={editName} onChangeText={setEditName} />
                  <SegmentedControl
                    options={[
                      { label: 'Haut du corps', value: 'upper' as const },
                      { label: 'Bas du corps', value: 'lower' as const },
                    ]}
                    value={editCategory}
                    onChange={setEditCategory}
                  />
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <Button title="Enregistrer" onPress={saveEditExercise} style={{ flex: 1 }} />
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
                      {ex.category === 'upper' ? 'Haut du corps' : 'Bas du corps'}
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
