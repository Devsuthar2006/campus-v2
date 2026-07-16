import type {
  MyProfile,
  PublicProfile,
  UpdateProfileInput,
  UpdatePrivacyInput,
  CompleteProfileInput,
  SetPasswordInput,
} from '@campusly/shared-types';
import { apiFetch } from './apiClient';

/** Profile & privacy API calls (API_SPEC.md §4). */
export const profileApi = {
  async getMyProfile(): Promise<MyProfile> {
    const data = await apiFetch<{ profile: MyProfile }>('/users/me/profile');
    return data.profile;
  },

  async updateProfile(input: UpdateProfileInput): Promise<MyProfile> {
    const data = await apiFetch<{ profile: MyProfile }>('/users/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return data.profile;
  },

  async updateInterests(interests: string[]): Promise<MyProfile> {
    const data = await apiFetch<{ profile: MyProfile }>('/users/me/interests', {
      method: 'PATCH',
      body: JSON.stringify({ interests }),
    });
    return data.profile;
  },

  async updatePrivacy(input: UpdatePrivacyInput): Promise<MyProfile> {
    const data = await apiFetch<{ profile: MyProfile }>('/users/me/privacy', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return data.profile;
  },

  async completeProfile(input: CompleteProfileInput): Promise<MyProfile> {
    const data = await apiFetch<{ profile: MyProfile }>('/users/me/complete-profile', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.profile;
  },

  /** Set or change password from Settings. */
  async setPassword(input: SetPasswordInput): Promise<void> {
    await apiFetch<{ success: boolean }>('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  async getPublicProfile(userId: string): Promise<PublicProfile> {
    const data = await apiFetch<{ profile: PublicProfile }>(`/users/${userId}`);
    return data.profile;
  },

  async search(query: string): Promise<PublicProfile[]> {
    const data = await apiFetch<{ results: PublicProfile[] }>(
      `/users/search?q=${encodeURIComponent(query)}`,
    );
    return data.results;
  },
};
