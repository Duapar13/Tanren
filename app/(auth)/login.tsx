import { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FormRow } from '../../components/FormRow';
import { OAuthButtons } from '../../components/OAuthButtons';
import { TanrenWordmark } from '../../components/TanrenWordmark';
import { useAuth } from '../../context/AuthContext';
import { authErrorMessage } from '../../lib/authErrors';
import { Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!identifier.trim() || !password) return;
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      Alert.alert('Connexion impossible', authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'center',
                padding: Spacing.lg,
                gap: Spacing.xl,
              }}
            >
              <View style={{ alignItems: 'center', gap: Spacing.xs }}>
                <TanrenWordmark size={48} />
                <ThemedText variant="subhead" color="secondary">
                  Content de te revoir
                </ThemedText>
              </View>

              <Card style={{ gap: 0 }}>
                <FormRow label="Email ou pseudo">
                  <Input
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    placeholder="toi@exemple.com"
                  />
                </FormRow>
                <FormRow label="Mot de passe">
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    placeholder="••••••••"
                  />
                </FormRow>
              </Card>

              <View style={{ gap: Spacing.md }}>
                <Button
                  title={submitting ? 'Connexion…' : 'Se connecter'}
                  onPress={handleSubmit}
                  disabled={submitting || !identifier.trim() || !password}
                />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
                  <ThemedText variant="caption" color="tertiary">
                    ou
                  </ThemedText>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
                </View>

                <OAuthButtons />
              </View>

              <Link href="/(auth)/signup" asChild>
                <Pressable style={{ alignItems: 'center', paddingVertical: Spacing.sm }}>
                  <ThemedText variant="subhead">
                    Pas encore de compte ?{' '}
                    <ThemedText variant="subhead" color="accent" weight="600">
                      Créer un compte
                    </ThemedText>
                  </ThemedText>
                </Pressable>
              </Link>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
