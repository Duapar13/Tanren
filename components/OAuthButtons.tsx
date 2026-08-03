import { Alert, Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useAppleAuth } from '../hooks/useAppleAuth';
import { Radius, Spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { authErrorMessage } from '../lib/authErrors';

export function OAuthButtons() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { loginWithGoogleIdToken, loginWithAppleIdToken } = useAuth();

  const google = useGoogleAuth(async (idToken) => {
    try {
      await loginWithGoogleIdToken(idToken);
    } catch (err) {
      Alert.alert(t.login.continueWithGoogle, authErrorMessage(err));
    }
  });

  const apple = useAppleAuth(async (idToken) => {
    try {
      await loginWithAppleIdToken(idToken);
    } catch (err) {
      Alert.alert(t.login.continueWithApple, authErrorMessage(err));
    }
  });

  const handleGoogle = async () => {
    if (!google.isConfigured) {
      Alert.alert(t.login.notConfiguredTitle, t.login.googleNotConfigured);
      return;
    }
    try {
      await google.promptAsync();
    } catch (err) {
      Alert.alert(t.login.continueWithGoogle, authErrorMessage(err));
    }
  };

  const handleApple = async () => {
    if (!apple.isConfigured) {
      Alert.alert(t.login.notConfiguredTitle, t.login.appleUnavailable);
      return;
    }
    try {
      await apple.promptAsync();
    } catch (err) {
      Alert.alert(t.login.continueWithApple, authErrorMessage(err));
    }
  };

  return (
    <View style={{ gap: Spacing.sm }}>
      <Pressable
        onPress={handleGoogle}
        style={(state) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: Spacing.md,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: state.pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="logo-google" size={18} color={colors.text} />
        <ThemedText variant="body" weight="600">
          {t.login.continueWithGoogle}
        </ThemedText>
      </Pressable>

      {Platform.OS === 'ios' && (
        <Pressable
          onPress={handleApple}
          style={(state) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: Spacing.md,
            borderRadius: Radius.md,
            backgroundColor: colors.text,
            opacity: state.pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="logo-apple" size={20} color={colors.background} />
          <ThemedText variant="body" weight="600" style={{ color: colors.background }}>
            {t.login.continueWithApple}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}
