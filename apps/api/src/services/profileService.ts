import type {
  MyProfile,
  PublicProfile,
  PrivacySettings,
  UpdateProfileInput,
  UpdatePrivacyInput,
  CompleteProfileInput,
  Interest,
} from '@campusly/shared-types';
import { NotFoundError, ForbiddenError, ConflictError } from '../domain/errors.js';
import type { PrivacySettingsRow, UserRow, ProfileRow } from '../db/schema.js';
import { userRepository } from '../repositories/userRepository.js';
import { profileRepository } from '../repositories/profileRepository.js';

function toPrivacy(row: PrivacySettingsRow): PrivacySettings {
  return {
    showLastSeen: row.showLastSeen,
    showOnlineStatus: row.showOnlineStatus,
    sendReadReceipts: row.sendReadReceipts,
    profileVisibility: row.profileVisibility,
    allowFriendRequests: row.allowFriendRequests,
  };
}

function toInterests(rows: { id: string; name: string }[]): Interest[] {
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

export const profileService = {
  /** Own full profile (GET /users/me/profile). */
  async getMyProfile(userId: string): Promise<MyProfile> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('Account not found.');
    await profileRepository.ensureRows(userId);
    const [profile, privacy, interests] = await Promise.all([
      profileRepository.getProfile(userId),
      profileRepository.getPrivacy(userId),
      profileRepository.getInterests(userId),
    ]);
    if (!profile || !privacy) throw new NotFoundError('Profile not found.');
    return buildMyProfile(user, profile, privacy, toInterests(interests));
  },

  /** Update editable fields (name → users; bio/gender → profiles). */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<MyProfile> {
    if (input.name !== undefined) {
      await userRepository.updateCoreFields(userId, { name: input.name });
    }
    const profileFields: { bio?: string | null; gender?: ProfileRow['gender'] } = {};
    if (input.bio !== undefined) profileFields.bio = input.bio;
    if (input.gender !== undefined) profileFields.gender = input.gender;
    await profileRepository.updateProfileFields(userId, profileFields);
    return this.getMyProfile(userId);
  },

  async updateInterests(userId: string, names: string[]): Promise<MyProfile> {
    await profileRepository.replaceInterests(userId, names);
    return this.getMyProfile(userId);
  },

  async updatePrivacy(userId: string, input: UpdatePrivacyInput): Promise<MyProfile> {
    await profileRepository.updatePrivacy(userId, input);
    return this.getMyProfile(userId);
  },

  /**
   * Completes onboarding (AUTH_SYSTEM.md §8, implementation 02): applies the
   * required fields + interests and transitions pending_verification → active.
   */
  async completeProfile(userId: string, input: CompleteProfileInput): Promise<MyProfile> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('Account not found.');
    if (user.accountStatus !== 'pending_verification' && user.accountStatus !== 'active') {
      throw new ForbiddenError('This account cannot complete onboarding.');
    }
    if (user.accountStatus === 'active') {
      throw new ConflictError('Your profile is already complete.');
    }

    await profileRepository.ensureRows(userId);
    await userRepository.updateCoreFields(userId, {
      name: input.name,
      year: input.year ?? null,
      branchId: input.branchId ?? null,
    });
    await profileRepository.updateProfileFields(userId, {
      bio: input.bio ?? null,
      gender: input.gender,
    });
    if (input.interests) await profileRepository.replaceInterests(userId, input.interests);

    // Final step: the account becomes active and unlocks the product.
    await userRepository.updateStatus(userId, 'active');
    return this.getMyProfile(userId);
  },

  /**
   * Visibility-gated public profile (AUTH_SYSTEM.md §9). Friendship-based
   * unlock arrives in Phase 05; until then 'friends' visibility is owner-only.
   */
  async getPublicProfile(viewerId: string, targetId: string): Promise<PublicProfile> {
    const target = await userRepository.findById(targetId);
    if (!target || target.deletedAt || target.accountStatus !== 'active') {
      throw new NotFoundError('User not found.');
    }
    await profileRepository.ensureRows(targetId);
    const [profile, privacy, interests] = await Promise.all([
      profileRepository.getProfile(targetId),
      profileRepository.getPrivacy(targetId),
      profileRepository.getInterests(targetId),
    ]);
    if (!profile || !privacy) throw new NotFoundError('User not found.');

    const isSelf = viewerId === targetId;
    if (!isSelf) {
      const viewer = await userRepository.findById(viewerId);
      const sameCampus = viewer?.universityId === target.universityId;
      if (privacy.profileVisibility === 'private') throw new NotFoundError('User not found.');
      // 'friends' is owner-only until the friend graph exists (Phase 05).
      if (privacy.profileVisibility === 'friends') throw new NotFoundError('User not found.');
      if (privacy.profileVisibility === 'campus' && !sameCampus) {
        throw new NotFoundError('User not found.');
      }
    }

    return {
      userId: target.id,
      name: target.name,
      universityId: target.universityId,
      branchId: target.branchId,
      year: target.year,
      gender: profile.gender,
      bio: profile.bio,
      avatarMediaId: profile.avatarMediaId,
      interests: toInterests(interests),
    };
  },

  /** Campus-scoped student search (GET /users/search). */
  async search(viewerId: string, query: string): Promise<PublicProfile[]> {
    const viewer = await userRepository.findById(viewerId);
    if (!viewer) throw new NotFoundError('Account not found.');
    if (query.trim().length < 2) return [];
    const matches = await userRepository.searchByName(viewer.universityId, query);
    return matches
      .filter((u) => u.id !== viewerId)
      .map((u) => ({
        userId: u.id,
        name: u.name,
        universityId: u.universityId,
        branchId: u.branchId,
        year: u.year,
        gender: null,
        bio: null,
        avatarMediaId: null,
        interests: [],
      }));
  },
};

function buildMyProfile(
  user: UserRow,
  profile: ProfileRow,
  privacy: PrivacySettingsRow,
  interests: Interest[],
): MyProfile {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    universityId: user.universityId,
    branchId: user.branchId,
    year: user.year,
    gender: profile.gender,
    bio: profile.bio,
    avatarMediaId: profile.avatarMediaId,
    role: user.role,
    accountStatus: user.accountStatus,
    subscriptionStatus: user.subscriptionStatus,
    interests,
    privacy: toPrivacy(privacy),
  };
}
