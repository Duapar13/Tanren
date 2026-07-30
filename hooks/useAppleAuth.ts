import { useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const APPLE_CLIENT_ID = process.env.EXPO_PUBLIC_APPLE_CLIENT_ID ?? '';

const discovery = {
  authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
};

/**
 * Flux web Apple (navigateur système) via expo-auth-session, response_mode=fragment
 * (nécessaire pour un redirect_uri non-https comme un scheme custom). Inactif tant que
 * EXPO_PUBLIC_APPLE_CLIENT_ID n'est pas défini (Services ID créé sur
 * https://developer.apple.com, nécessite un compte Apple Developer Program payant).
 */
export function useAppleAuth(onIdToken: (idToken: string) => void) {
  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: APPLE_CLIENT_ID,
      scopes: ['name', 'email'],
      redirectUri,
      responseType: 'code id_token' as AuthSession.ResponseType,
      usePKCE: false,
      extraParams: {
        response_mode: 'fragment',
        nonce: Math.random().toString(36).slice(2),
      },
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) {
      onIdToken(response.params.id_token);
    }
  }, [response, onIdToken]);

  return {
    isConfigured: APPLE_CLIENT_ID.length > 0,
    canPrompt: !!request,
    promptAsync,
    redirectUri,
  };
}
