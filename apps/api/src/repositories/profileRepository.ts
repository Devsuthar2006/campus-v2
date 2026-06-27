import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  profiles,
  privacySettings,
  interests,
  userInterests,
  type ProfileRow,
  type PrivacySettingsRow,
  type InterestRow,
} from '../db/schema.js';

/**
 * Data access for the profile module (DATABASE_SCHEMA.md §6):
 * profiles, privacy_settings, interests, user_interests.
 */
export const profileRepository = {
  async getProfile(userId: string): Promise<ProfileRow | null> {
    const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    return rows[0] ?? null;
  },

  async getPrivacy(userId: string): Promise<PrivacySettingsRow | null> {
    const rows = await db
      .select()
      .from(privacySettings)
      .where(eq(privacySettings.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Ensures profile + privacy rows exist (defensive for pre-Phase-02 users). */
  async ensureRows(userId: string): Promise<void> {
    await db.insert(profiles).values({ userId }).onConflictDoNothing();
    await db.insert(privacySettings).values({ userId }).onConflictDoNothing();
  },

  async getInterests(userId: string): Promise<InterestRow[]> {
    return db
      .select({ id: interests.id, name: interests.name, createdAt: interests.createdAt })
      .from(userInterests)
      .innerJoin(interests, eq(interests.id, userInterests.interestId))
      .where(eq(userInterests.userId, userId));
  },

  async updateProfileFields(
    userId: string,
    fields: { bio?: string | null; gender?: ProfileRow['gender'] },
  ): Promise<void> {
    if (Object.keys(fields).length === 0) return;
    await db
      .update(profiles)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(profiles.userId, userId));
  },

  async updatePrivacy(
    userId: string,
    fields: Partial<Omit<PrivacySettingsRow, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<void> {
    if (Object.keys(fields).length === 0) return;
    await db
      .update(privacySettings)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(privacySettings.userId, userId));
  },

  /**
   * Replaces a user's interest set. Interest names are normalized lowercase,
   * upserted into the shared vocabulary, then linked (DATABASE_SCHEMA.md §6.2).
   */
  async replaceInterests(userId: string, names: string[]): Promise<void> {
    const normalized = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))];
    await db.transaction(async (tx) => {
      await tx.delete(userInterests).where(eq(userInterests.userId, userId));
      if (normalized.length === 0) return;
      await tx
        .insert(interests)
        .values(normalized.map((name) => ({ name })))
        .onConflictDoNothing();
      const rows = await tx
        .select({ id: interests.id })
        .from(interests)
        .where(inArray(interests.name, normalized));
      if (rows.length > 0) {
        await tx
          .insert(userInterests)
          .values(rows.map((r) => ({ userId, interestId: r.id })))
          .onConflictDoNothing();
      }
    });
  },
};
