import { useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

/**
 * Flux web (navigateur système) via expo-auth-session — fonctionne dans Expo Go,
 * pas besoin de dev build. Inactif tant que EXPO_PUBLIC_GOOGLE_CLIENT_ID n'est pas défini
 * (créer un client OAuth "Web application" sur https://console.cloud.google.com).
 */
export function useGoogleAuth(onIdToken: (idToken: string) => void) {
  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'email', 'profile'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      extraParams: { nonce: Math.random().toString(36).slice(2) },
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) {
      onIdToken(response.params.id_token);
    }
  }, [response, onIdToken]);

  return {
    isConfigured: GOOGLE_CLIENT_ID.length > 0,
    canPrompt: !!request,
    promptAsync,
    redirectUri,
  };
}
