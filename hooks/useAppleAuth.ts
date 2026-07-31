import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

/**
 * Native "Sign in with Apple" (expo-apple-authentication) — requires a real EAS build, not
 * Expo Go. The identity token's audience is the app's bundle ID (com.duapar.tanren), not a
 * separate web Services ID, so no extra Apple portal resource is needed beyond enabling the
 * "Sign In with Apple" capability (handled automatically by this package's config plugin).
 */
export function useAppleAuth(onIdToken: (idToken: string) => void) {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setIsAvailable);
  }, []);

  const promptAsync = useCallback(async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        onIdToken(credential.identityToken);
      }
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      throw err;
    }
  }, [onIdToken]);

  return {
    isConfigured: isAvailable,
    canPrompt: isAvailable,
    promptAsync,
  };
}
