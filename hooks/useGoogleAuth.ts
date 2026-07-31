import { useCallback, useEffect } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

/**
 * Native Google Sign In — requires a real EAS build, not Expo Go. The returned ID token's
 * audience is always the *web* client ID (not the iOS one) regardless of platform, which is
 * exactly what the server already verifies against; the iOS client ID is only needed for the
 * native SDK's own URL scheme handling. Inactive until both env vars below are set — create a
 * Google Cloud project, then a "Web application" and an "iOS" OAuth client under it.
 */
export function useGoogleAuth(onIdToken: (idToken: string) => void) {
  const isConfigured = WEB_CLIENT_ID.length > 0 && IOS_CLIENT_ID.length > 0;

  useEffect(() => {
    if (!isConfigured) return;
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID });
  }, [isConfigured]);

  const promptAsync = useCallback(async () => {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }).catch(() => {});
    const response = await GoogleSignin.signIn();
    if (response.type === 'success' && response.data.idToken) {
      onIdToken(response.data.idToken);
    }
  }, [onIdToken]);

  return { isConfigured, canPrompt: isConfigured, promptAsync };
}
