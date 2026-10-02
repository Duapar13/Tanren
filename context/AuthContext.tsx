import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { User } from '../types';
import {
  apiFetch,
  ApiError,
  clearTokens,
  getTokens,
  isNetworkError,
  publicFetch,
  setTokens,
} from '../lib/api';
import { markSkipWipe, onAuthLost } from '../lib/authEvents';

type ProfilePatch = Partial<{
  displayName: string;
  username: string;
  email: string;
  heightCm: number | null;
  goal: User['goal'];
  restTimerEnabled: boolean;
  restTimerSeconds: number;
  restTimerMode: User['restTimerMode'];
  trainingDays: number[];
  rpeEnabled: boolean;
  measurementsEnabled: boolean;
  customProteinG: number | null;
  customCarbsG: number | null;
  customFatG: number | null;
  onboardingCompleted: boolean;
  pushToken: string | null;
  dailyReminderEnabled: boolean;
  weightUnit: User['weightUnit'];
  lengthUnit: User['lengthUnit'];
}>;

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  loginWithAppleIdToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_CACHE_KEY = 'ningyma:cachedUser';
const PENDING_PROFILE_KEY = 'ningyma:pendingProfilePatch';

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best effort: a failed cache write only costs the offline launch path.
  }
}

async function clearProfileCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([USER_CACHE_KEY, PENDING_PROFILE_KEY]);
  } catch {
    // ignore
  }
}

/** Mirrors on the cached user what the server would have stored for this patch. */
function applyPatchLocally(user: User, patch: ProfilePatch): User {
  const { pushToken, ...rest } = patch;
  const next = { ...user, ...rest } as User;
  if ('pushToken' in patch) next.pushNotificationsEnabled = pushToken != null;
  return next;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setAndCacheUser = useCallback((me: User) => {
    setUser(me);
    writeJson(USER_CACHE_KEY, me);
  }, []);

  const restoreSession = useCallback(async () => {
    const { accessToken, refreshToken } = await getTokens();
    if (!accessToken && !refreshToken) {
      setLoading(false);
      return;
    }

    // Offline-first: a cached profile lets the app open instantly (and without any network);
    // the real profile is refreshed in the background once we can reach the server.
    const cached = await readJson<User>(USER_CACHE_KEY);
    if (cached) {
      setUser(cached);
      setLoading(false);
      return;
    }

    try {
      const me = await apiFetch('/users/me');
      setAndCacheUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setAndCacheUser]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  /** Sends settings changed while offline, then pulls the authoritative profile. */
  const syncProfile = useCallback(async () => {
    const pending = await readJson<ProfilePatch>(PENDING_PROFILE_KEY);
    try {
      if (pending && Object.keys(pending).length > 0) {
        const me = await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(pending) });
        await AsyncStorage.removeItem(PENDING_PROFILE_KEY);
        setAndCacheUser(me);
        return;
      }
      const me = await apiFetch('/users/me');
      setAndCacheUser(me);
    } catch (err) {
      // A permanent rejection (e.g. 400) would otherwise be retried forever.
      if (pending && err instanceof ApiError && !isNetworkError(err) && err.status !== 401) {
        await AsyncStorage.removeItem(PENDING_PROFILE_KEY);
      }
    }
  }, [setAndCacheUser]);

  useEffect(() => {
    if (!user) return;
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) syncProfile();
    });
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') syncProfile();
    });
    return () => {
      unsubscribeNet();
      appStateSub.remove();
    };
  }, [user?.id, syncProfile]);

  // The server explicitly refused our refresh token: sign out, but keep the local rows so the
  // user's unsynced work is still there after logging back into the same account.
  useEffect(
    () =>
      onAuthLost(() => {
        markSkipWipe();
        clearTokens().catch(() => {});
        clearProfileCache();
        setUser(null);
      }),
    []
  );

  const applyAuthResponse = useCallback(
    async (data: { user: User; accessToken: string; refreshToken: string }) => {
      await setTokens(data.accessToken, data.refreshToken);
      await AsyncStorage.removeItem(PENDING_PROFILE_KEY).catch(() => {});
      setAndCacheUser(data.user);
    },
    [setAndCacheUser]
  );

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
    await clearProfileCache();
    setUser(null);
    if (refreshToken) {
      publicFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    await apiFetch('/users/me', { method: 'DELETE' });
    const { refreshToken } = await getTokens();
    await clearTokens();
    await clearProfileCache();
    setUser(null);
    if (refreshToken) {
      publicFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
  }, []);

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      // Changes queued while offline are sent together with this one so ordering is preserved
      // (last write wins for any key present in both).
      const pending = (await readJson<ProfilePatch>(PENDING_PROFILE_KEY)) ?? {};
      const merged = { ...pending, ...patch };
      try {
        const me = await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(merged) });
        await AsyncStorage.removeItem(PENDING_PROFILE_KEY);
        setAndCacheUser(me);
      } catch (err) {
        // Username / email need the server to check uniqueness, so those can't be applied offline.
        const needsServer = 'username' in patch || 'email' in patch;
        if (!isNetworkError(err) || needsServer) throw err;
        await writeJson(PENDING_PROFILE_KEY, merged);
        setUser((prev) => {
          if (!prev) return prev;
          const next = applyPatchLocally(prev, patch);
          writeJson(USER_CACHE_KEY, next);
          return next;
        });
      }
    },
    [setAndCacheUser]
  );

  const uploadAvatar = useCallback(
    async (uri: string) => {
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
      setAndCacheUser(me);
    },
    [setAndCacheUser]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogleIdToken,
        loginWithAppleIdToken,
        logout,
        deleteAccount,
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
