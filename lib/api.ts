import * as SecureStore from 'expo-secure-store';

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

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
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
  } catch {
    await clearTokens();
    return null;
  }
}

/** For authenticated endpoints — attaches the access token and retries once via refresh on 401. */
export async function apiFetch(path: string, options: RequestInit = {}) {
  const { accessToken: initialToken } = await getTokens();
  const request = (token: string | null) =>
    fetchWithTimeout(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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
    if (!newToken) throw new ApiError(401, 'unauthenticated');
    res = await request(newToken);
  }

  if (!res.ok) throw await parseError(res);
  return parseOk(res);
}
