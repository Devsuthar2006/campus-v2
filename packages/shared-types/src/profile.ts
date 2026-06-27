import { z } from 'zod';
import type { AccountStatus, SubscriptionStatus, UserRole } from './auth';

/**
 * Profile & privacy contracts (DATABASE_SCHEMA.md §6, AUTH_SYSTEM.md §9).
 * Single source of truth shared by api and web.
 */

export const GENDERS = ['male', 'female', 'other', 'prefer_not'] as const;
export type Gender = (typeof GENDERS)[number];

export const PROFILE_VISIBILITIES = ['campus', 'friends', 'private'] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export const FRIEND_REQUEST_POLICIES = ['everyone', 'campus', 'none'] as const;
export type FriendRequestPolicy = (typeof FRIEND_REQUEST_POLICIES)[number];

/** A single interest tag. */
export interface Interest {
  id: string;
  name: string;
}

/** Per-user privacy settings. */
export interface PrivacySettings {
  showLastSeen: boolean;
  showOnlineStatus: boolean;
  sendReadReceipts: boolean;
  profileVisibility: ProfileVisibility;
  allowFriendRequests: FriendRequestPolicy;
}

/** The full own-profile view (verified fields + editable fields + interests). */
export interface MyProfile {
  userId: string;
  name: string;
  email: string;
  universityId: string;
  branchId: string | null;
  year: number | null;
  gender: Gender | null;
  bio: string | null;
  avatarMediaId: string | null;
  role: UserRole;
  accountStatus: AccountStatus;
  subscriptionStatus: SubscriptionStatus;
  interests: Interest[];
  privacy: PrivacySettings;
}

/** Visibility-gated public view of another student's profile. */
export interface PublicProfile {
  userId: string;
  name: string;
  universityId: string;
  branchId: string | null;
  year: number | null;
  gender: Gender | null;
  bio: string | null;
  avatarMediaId: string | null;
  interests: Interest[];
}

// --- Request schemas ---

/** PATCH /users/me/profile — editable fields only (verified fields are immutable). */
export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(280).optional(),
  gender: z.enum(GENDERS).optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/** PATCH /users/me/interests — replace the user's interest set by name. */
export const UpdateInterestsSchema = z.object({
  interests: z.array(z.string().trim().min(1).max(40)).max(20),
});
export type UpdateInterestsInput = z.infer<typeof UpdateInterestsSchema>;

/** PATCH /users/me/privacy — partial privacy update. */
export const UpdatePrivacySchema = z.object({
  showLastSeen: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  sendReadReceipts: z.boolean().optional(),
  profileVisibility: z.enum(PROFILE_VISIBILITIES).optional(),
  allowFriendRequests: z.enum(FRIEND_REQUEST_POLICIES).optional(),
});
export type UpdatePrivacyInput = z.infer<typeof UpdatePrivacySchema>;

/** POST /users/me/complete-profile — finishes onboarding (pending → active). */
export const CompleteProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  bio: z.string().trim().max(280).optional(),
  gender: z.enum(GENDERS).optional(),
  year: z.number().int().min(1).max(10).optional(),
  branchId: z.string().uuid().optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});
export type CompleteProfileInput = z.infer<typeof CompleteProfileSchema>;
