import type {
  Community,
  CommunityMember,
  CommunityPost,
  CommunityInvite,
  CreateCommunityInput,
  CreateCommunityPostInput,
  MyMembership,
  ReactionType,
} from '@campusly/shared-types';
import { apiFetch } from './apiClient';

/** Communities & Clubs REST client (API_SPEC.md §9). */
export const communitiesApi = {
  async browse(
    q?: string,
    cursor?: string,
  ): Promise<{ communities: Community[]; nextCursor: string | null }> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cursor) params.set('cursor', cursor);
    return apiFetch(`/communities?${params.toString()}`);
  },

  async create(input: CreateCommunityInput): Promise<Community> {
    const data = await apiFetch<{ community: Community }>('/communities', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.community;
  },

  async detail(id: string): Promise<Community> {
    const data = await apiFetch<{ community: Community }>(`/communities/${id}`);
    return data.community;
  },

  async join(id: string): Promise<MyMembership> {
    const data = await apiFetch<{ membership: MyMembership }>(`/communities/${id}/join`, {
      method: 'POST',
    });
    return data.membership;
  },

  async leave(id: string): Promise<void> {
    await apiFetch(`/communities/${id}/leave`, { method: 'POST' });
  },

  async feed(
    id: string,
    cursor?: string,
  ): Promise<{ posts: CommunityPost[]; nextCursor: string | null }> {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiFetch(`/communities/${id}/feed${q}`);
  },

  async createPost(id: string, input: CreateCommunityPostInput): Promise<CommunityPost> {
    const data = await apiFetch<{ post: CommunityPost }>(`/communities/${id}/posts`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.post;
  },

  async deletePost(postId: string): Promise<void> {
    await apiFetch(`/communities/posts/${postId}`, { method: 'DELETE' });
  },

  async react(postId: string, type: ReactionType): Promise<{ count: number }> {
    return apiFetch(`/communities/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  },

  async unreact(postId: string): Promise<{ count: number }> {
    return apiFetch(`/communities/posts/${postId}/react`, { method: 'DELETE' });
  },

  async members(id: string): Promise<CommunityMember[]> {
    const data = await apiFetch<{ members: CommunityMember[] }>(`/communities/${id}/members`);
    return data.members;
  },

  async approve(id: string, userId: string): Promise<void> {
    await apiFetch(`/communities/${id}/members/${userId}/approve`, { method: 'POST' });
  },

  async changeRole(id: string, userId: string, role: 'moderator' | 'member'): Promise<void> {
    await apiFetch(`/communities/${id}/members/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async removeMember(id: string, userId: string): Promise<void> {
    await apiFetch(`/communities/${id}/members/${userId}`, { method: 'DELETE' });
  },

  async invites(): Promise<CommunityInvite[]> {
    const data = await apiFetch<{ invites: CommunityInvite[] }>('/communities/invites');
    return data.invites;
  },

  async respondInvite(inviteId: string, accept: boolean): Promise<void> {
    await apiFetch(`/communities/invites/${inviteId}/${accept ? 'accept' : 'decline'}`, {
      method: 'POST',
    });
  },
};
