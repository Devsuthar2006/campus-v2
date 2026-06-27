import type {
  WallPost,
  WallReply,
  WallCategory,
  WallFeedResponse,
  CreatePostInput,
  CreateReplyInput,
  ReactionType,
} from '@campusly/shared-types';
import { apiFetch } from './apiClient';

/**
 * Campus Wall REST client (API_SPEC.md §7). Creation/mutation here; realtime
 * fan-out arrives over the campus socket room (see useWallFeed).
 */
export const wallApi = {
  async categories(): Promise<WallCategory[]> {
    const data = await apiFetch<{ categories: WallCategory[] }>('/wall/categories');
    return data.categories;
  },

  async feed(params: {
    mode?: 'latest' | 'trending';
    categoryId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<WallFeedResponse> {
    const q = new URLSearchParams();
    if (params.mode) q.set('mode', params.mode);
    if (params.categoryId) q.set('categoryId', params.categoryId);
    if (params.cursor) q.set('cursor', params.cursor);
    if (params.limit) q.set('limit', String(params.limit));
    return apiFetch<WallFeedResponse>(`/wall/posts?${q.toString()}`);
  },

  async trending(): Promise<WallFeedResponse> {
    return apiFetch<WallFeedResponse>('/wall/trending');
  },

  async search(q: string, cursor?: string): Promise<WallFeedResponse> {
    const params = new URLSearchParams({ q });
    if (cursor) params.set('cursor', cursor);
    return apiFetch<WallFeedResponse>(`/wall/posts/search?${params.toString()}`);
  },

  async getPost(id: string): Promise<{ post: WallPost; replies: WallReply[] }> {
    return apiFetch(`/wall/posts/${id}`);
  },

  async createPost(input: CreatePostInput): Promise<WallPost> {
    const data = await apiFetch<{ post: WallPost }>('/wall/posts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.post;
  },

  async updatePost(id: string, body: string): Promise<WallPost> {
    const data = await apiFetch<{ post: WallPost }>(`/wall/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    });
    return data.post;
  },

  async deletePost(id: string): Promise<void> {
    await apiFetch(`/wall/posts/${id}`, { method: 'DELETE' });
  },

  async reply(postId: string, input: CreateReplyInput): Promise<WallReply> {
    const data = await apiFetch<{ reply: WallReply }>(`/wall/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.reply;
  },

  async deleteReply(id: string): Promise<void> {
    await apiFetch(`/wall/replies/${id}`, { method: 'DELETE' });
  },

  async react(
    id: string,
    targetType: 'wall_post' | 'wall_reply',
    type: ReactionType,
  ): Promise<{ count: number }> {
    return apiFetch(`/wall/posts/${id}/react`, {
      method: 'POST',
      body: JSON.stringify({ targetType, type }),
    });
  },

  async unreact(id: string, targetType: 'wall_post' | 'wall_reply'): Promise<{ count: number }> {
    return apiFetch(`/wall/posts/${id}/react?targetType=${targetType}`, { method: 'DELETE' });
  },

  async bookmark(id: string): Promise<void> {
    await apiFetch(`/wall/posts/${id}/bookmark`, { method: 'POST' });
  },

  async unbookmark(id: string): Promise<void> {
    await apiFetch(`/wall/posts/${id}/bookmark`, { method: 'DELETE' });
  },

  async bookmarks(cursor?: string): Promise<WallFeedResponse> {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiFetch<WallFeedResponse>(`/wall/bookmarks${q}`);
  },

  async vote(postId: string, optionId: string): Promise<WallPost> {
    const data = await apiFetch<{ post: WallPost }>(`/wall/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    });
    return data.post;
  },

  async report(
    postId: string,
    targetType: 'wall_post' | 'wall_reply',
    targetId: string,
    reason: 'spam' | 'harassment' | 'hate' | 'nsfw' | 'safety' | 'other',
    details?: string,
  ): Promise<void> {
    await apiFetch(`/wall/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId, reason, details }),
    });
  },
};
