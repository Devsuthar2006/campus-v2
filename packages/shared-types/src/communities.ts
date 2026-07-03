import { z } from 'zod';
import type { ReactionType } from './wall.js';

/**
 * Communities & Clubs contracts (DATABASE_SCHEMA.md §11, API_SPEC.md §9,
 * PUBLIC_WALL.md post patterns). A club is a specialized, verifiable community.
 * Community posts reuse the polymorphic reactions table (target community_post).
 */

export const COMMUNITY_TYPES = ['community', 'club'] as const;
export type CommunityType = (typeof COMMUNITY_TYPES)[number];

export const COMMUNITY_VISIBILITIES = ['public', 'request', 'invite'] as const;
export type CommunityVisibility = (typeof COMMUNITY_VISIBILITIES)[number];

export const COMMUNITY_ROLES = ['owner', 'moderator', 'member'] as const;
export type CommunityRole = (typeof COMMUNITY_ROLES)[number];

export const COMMUNITY_MEMBER_STATUSES = ['active', 'pending', 'banned'] as const;
export type CommunityMemberStatus = (typeof COMMUNITY_MEMBER_STATUSES)[number];

export const COMMUNITY_INVITE_STATUSES = ['pending', 'accepted', 'declined', 'expired'] as const;
export type CommunityInviteStatus = (typeof COMMUNITY_INVITE_STATUSES)[number];

export const COMMUNITY_POST_TYPES = ['text', 'announcement'] as const;
export type CommunityPostType = (typeof COMMUNITY_POST_TYPES)[number];

/** Membership of the current viewer relative to a community. */
export interface MyMembership {
  role: CommunityRole;
  status: CommunityMemberStatus;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: CommunityType;
  visibility: CommunityVisibility;
  isVerified: boolean;
  iconMediaId: string | null;
  memberCount: number;
  createdAt: string;
  myMembership: MyMembership | null;
}

export interface CommunityMember {
  userId: string;
  name: string;
  avatarMediaId: string | null;
  role: CommunityRole;
  status: CommunityMemberStatus;
  joinedAt: string;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  author: { id: string; name: string; avatarMediaId: string | null } | null;
  isAnonymous: boolean;
  postType: CommunityPostType;
  body: string | null;
  reactionCount: number;
  myReaction: ReactionType | null;
  createdAt: string;
}

export interface CommunityInvite {
  id: string;
  community: { id: string; name: string; slug: string };
  inviterId: string;
  status: CommunityInviteStatus;
  createdAt: string;
}

// --- Request schemas ---

export const CreateCommunitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens'),
  description: z.string().trim().max(500).optional(),
  type: z.enum(COMMUNITY_TYPES).default('community'),
  visibility: z.enum(COMMUNITY_VISIBILITIES).default('public'),
});
export type CreateCommunityInput = z.infer<typeof CreateCommunitySchema>;

export const CreateCommunityPostSchema = z.object({
  postType: z.enum(COMMUNITY_POST_TYPES).default('text'),
  body: z.string().trim().min(1).max(5000),
  isAnonymous: z.boolean().default(false),
});
export type CreateCommunityPostInput = z.infer<typeof CreateCommunityPostSchema>;

export const CommunityReactSchema = z.object({
  type: z.enum(['like', 'love', 'laugh', 'insightful', 'support']).default('like'),
});

export const InviteSchema = z.object({ inviteeId: z.string().uuid() });

export const RoleChangeSchema = z.object({ role: z.enum(['moderator', 'member']) });

export const CommunityBrowseQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CommunityBrowseQuery = z.infer<typeof CommunityBrowseQuerySchema>;

export const CommunityFeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
