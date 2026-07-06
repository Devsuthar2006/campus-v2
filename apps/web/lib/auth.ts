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

  async me(): Promise<AuthUser | null> {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) return null;

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

  /** Sign in with email + password. */
  async loginWithEmail(email: string, password: string): Promise<AuthUser> {
    const data = await apiFetch<AuthResponse>('/auth/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    authStorage.setTokens(data.tokens);
    return data.user;
  },

  /** Check if a username is available (for onboarding). */
  async checkUsername(username: string): Promise<{ available: boolean }> {
    return apiFetch<{ available: boolean }>('/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username }),
      skipAuth: true,
    });
  },
};
