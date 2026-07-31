import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { User } from '../types';
import { apiFetch, clearTokens, getTokens, publicFetch, setTokens } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  loginWithAppleIdToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<{
    displayName: string;
    username: string;
    email: string;
    heightCm: number | null;
    goal: User['goal'];
    restTimerEnabled: boolean;
    restTimerSeconds: number;
    trainingDays: number[];
    rpeEnabled: boolean;
    measurementsEnabled: boolean;
    customProteinG: number | null;
    customCarbsG: number | null;
    customFatG: number | null;
    onboardingCompleted: boolean;
    pushToken: string | null;
    weightUnit: User['weightUnit'];
    lengthUnit: User['lengthUnit'];
  }>) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const { accessToken, refreshToken } = await getTokens();
    if (!accessToken && !refreshToken) {
      setLoading(false);
      return;
    }
    try {
      const me = await apiFetch('/users/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const applyAuthResponse = useCallback(async (data: { user: User; accessToken: string; refreshToken: string }) => {
    await setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const loginWithGoogleIdToken = useCallback(
    async (idToken: string) => {
      const data = await publicFetch('/auth/oauth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });
      await applyAuthResponse(data);
    },
    [applyAuthResponse]
  );

  const loginWithAppleIdToken = useCallback(
    async (idToken: string) => {
      const data = await publicFetch('/auth/oauth/apple', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });
      await applyAuthResponse(data);
    },
    [applyAuthResponse]
  );

  const logout = useCallback(async () => {
    const { refreshToken } = await getTokens();
    await clearTokens();
    setUser(null);
    if (refreshToken) {
      publicFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
  }, []);

  const updateProfile = useCallback(async (patch: Parameters<AuthContextValue['updateProfile']>[0]) => {
    const me = await apiFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setUser(me);
  }, []);

  const uploadAvatar = useCallback(async (uri: string) => {
    const filename = uri.split('/').pop() ?? 'avatar.jpg';
    const ext = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase();
    const type = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    // React Native's fetch/FormData accepts this {uri, name, type} shape for file uploads —
    // not the standard web File/Blob API, hence the cast.
    formData.append('avatar', { uri, name: filename, type } as unknown as Blob);

    const me = await apiFetch('/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogleIdToken,
        loginWithAppleIdToken,
        logout,
        updateProfile,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
