import * as SecureStore from 'expo-secure-store';
import { emitAuthLost } from './authEvents';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api-tanren.duapar.fr';

const ACCESS_KEY = 'tanren_access_token';
const REFRESH_KEY = 'tanren_refresh_token';

export async function getTokens() {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  return { accessToken, refreshToken };
}

export async function setTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}

const LOCAL_DATA_OWNER_KEY = 'tanren_local_data_owner';

/**
 * Which account's data currently lives in local SQLite. Used to catch the case where a
 * session never cleanly logged out (e.g. its token went stale — account deleted, wiped
 * test data — while the app was closed) and a different account then logs in on the same
 * device: without this, the new account would inherit the old one's cached rows instead
 * of getting a fresh pull, since the "wipe on logout" path only fires on an actual
 * logged-in-to-logged-out transition, which never happens if `user` was null all along.
 */
export async function getLocalDataOwner(): Promise<number | null> {
  const raw = await SecureStore.getItemAsync(LOCAL_DATA_OWNER_KEY);
  return raw ? parseInt(raw, 10) : null;
}

export async function setLocalDataOwner(userId: number | null): Promise<void> {
  if (userId === null) await SecureStore.deleteItemAsync(LOCAL_DATA_OWNER_KEY);
  else await SecureStore.setItemAsync(LOCAL_DATA_OWNER_KEY, String(userId));
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

/** True when the request never got a usable answer (offline, timeout, server down) — as opposed to
 * the server explicitly rejecting it. Callers keep the session and local data in that case. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiError) return err.status === 0 || err.status >= 500;
  return true;
}

const REQUEST_TIMEOUT_MS = 15000;

/** Native fetch never times out on its own — without this, a stuck server leaves the UI frozen forever. */
async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(0, 'timeout');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let code = 'unknown_error';
  try {
    const body = await res.json();
    if (body?.error) code = body.error;
  } catch {
    // no JSON body
  }
  return new ApiError(res.status, code);
}

async function parseOk(res: Response) {
  if (res.status === 204) return null;
  return res.json();
}

/** For unauthenticated endpoints (signup/login/oauth/refresh) — never retries, always surfaces the real server error. */
export async function publicFetch(path: string, options: RequestInit = {}) {
  const res = await fetchWithTimeout(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  if (!res.ok) throw await parseError(res);
  return parseOk(res);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = await getTokens();
  if (!refreshToken) return null;
  try {
    const data = await publicFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    await setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch (err) {
    // Offline or server down: keep the tokens, otherwise a plane ride would sign the user out.
    if (isNetworkError(err)) throw err;
    await clearTokens();
    return null;
  }
}

/** For authenticated endpoints — attaches the access token and retries once via refresh on 401. */
export async function apiFetch(path: string, options: RequestInit = {}) {
  const { accessToken: initialToken } = await getTokens();
  // A FormData body (avatar upload) needs fetch to set its own multipart boundary —
  // forcing application/json here would corrupt the request.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const request = (token: string | null) =>
    fetchWithTimeout(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });

  let res = await request(initialToken);

  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (!newToken) {
      emitAuthLost();
      throw new ApiError(401, 'unauthenticated');
    }
    res = await request(newToken);
  }

  if (!res.ok) throw await parseError(res);
  return parseOk(res);
}
