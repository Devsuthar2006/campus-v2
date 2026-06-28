import type { AuthResponse, AuthUser } from '@campusly/shared-types';
import { apiFetch } from './apiClient';
import { authStorage } from './authStorage';

/**
 * Auth API calls (API_SPEC.md §3, AUTH_SYSTEM.md). Token persistence is handled
 * here so callers (the AuthProvider) deal only with the user.
 */
export const authApi = {
  /** Exchange a Google credential for a session. */
  async loginWithGoogle(credential: string): Promise<AuthUser> {
    const data = await apiFetch<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
      skipAuth: true,
    });
    authStorage.setTokens(data.tokens);
    return data.user;
  },

  /**
   * Returns the current user, or null if not authenticated.
   * On page refresh the in-memory access token is gone, so we explicitly
   * exchange the persisted refresh token for a fresh session first.
   */
  async me(): Promise<AuthUser | null> {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) return null;

    // If the access token is stale (always true after a page reload),
    // exchange the refresh token for a fresh pair before calling /auth/me.
    if (authStorage.isAccessTokenExpired()) {
      try {
        const data = await apiFetch<AuthResponse>('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
          skipAuth: true, // This endpoint doesn't require a Bearer token.
        });
        authStorage.setTokens(data.tokens);
      } catch {
        // If the refresh token itself is rejected, the session is truly gone.
        authStorage.clear();
        return null;
      }
    }

    // Now we have a valid access token — fetch the user profile.
    try {
      const data = await apiFetch<{ user: AuthUser }>('/auth/me');
      return data.user;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    const refreshToken = authStorage.getRefreshToken();
    try {
      await apiFetch<{ success: boolean }>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } finally {
      authStorage.clear();
    }
  },

  async deleteAccount(): Promise<void> {
    await apiFetch<{ success: boolean }>('/auth/account', { method: 'DELETE' });
    authStorage.clear();
  },
};
