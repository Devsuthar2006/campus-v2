import { isApiError, type ApiResponse, type AuthResponse } from '@campusly/shared-types';
import { apiUrl } from './env';
import { authStorage } from './authStorage';

/**
 * Thin fetch wrapper that understands the standard API envelope (API_SPEC.md §2.3).
 * Returns `data` on success and throws `ApiClientError` on the error envelope.
 *
 * Phase 01: injects the Bearer access token and transparently refreshes once on
 * a 401/unauthorized (AUTH_SYSTEM.md §4.7), then retries the original request.
 */
export class ApiClientError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
  }
}

interface FetchOptions extends RequestInit {
  /** Set true for endpoints that must not attach a token or attempt refresh. */
  skipAuth?: boolean;
}

async function rawFetch<T>(path: string, init: FetchOptions, token: string | null): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const body = (await res.json()) as ApiResponse<T>;
  if (isApiError(body)) {
    throw new ApiClientError(body.error.code, body.error.message);
  }
  return body.data;
}

let refreshPromise: Promise<boolean> | null = null;

/** Attempts a one-time refresh-token rotation. Returns true on success. */
async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) {
    console.debug('[auth] tryRefresh: refresh already in progress, waiting for it...');
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) {
      console.debug('[auth] tryRefresh: no refresh token in storage');
      return false;
    }
    try {
      console.debug('[auth] tryRefresh: attempting token refresh...');
      const data = await rawFetch<AuthResponse>(
        '/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken }) },
        null,
      );
      authStorage.setTokens(data.tokens);
      console.debug('[auth] tryRefresh: success, new access token stored');
      return true;
    } catch (err) {
      console.debug('[auth] tryRefresh: failed', err);
      // Only clear tokens if the server explicitly rejected the refresh token.
      // Network errors / transient failures should NOT wipe stored credentials.
      if (err instanceof ApiClientError) {
        console.debug('[auth] tryRefresh: API rejected token, clearing storage');
        authStorage.clear();
      }
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function apiFetch<T>(path: string, init: FetchOptions = {}): Promise<T> {
  const { skipAuth, ...rest } = init;

  if (skipAuth) {
    return rawFetch<T>(path, rest, null);
  }

  // Proactively refresh an expired access token before the request.
  if (authStorage.isAccessTokenExpired() && authStorage.getRefreshToken()) {
    const refreshed = await tryRefresh();
    // If refresh failed and we still have no usable token, bail immediately.
    if (!refreshed && !authStorage.getAccessToken()) {
      throw new ApiClientError('authentication_failed', 'Session could not be restored.');
    }
  }

  // Final guard: don't send a request without any token.
  const token = authStorage.getAccessToken();
  if (!token) {
    throw new ApiClientError('authentication_failed', 'No access token available.');
  }

  try {
    return await rawFetch<T>(path, rest, token);
  } catch (err) {
    // Reactive refresh on a 401, then retry once.
    if (
      err instanceof ApiClientError &&
      (err.code === 'unauthorized' || err.code === 'authentication_failed')
    ) {
      if (await tryRefresh()) {
        return rawFetch<T>(path, rest, authStorage.getAccessToken());
      }
    }
    throw err;
  }
}
