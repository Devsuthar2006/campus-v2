import { and, desc, eq, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import type {
  CommunityType,
  CommunityVisibility,
  CommunityRole,
  CommunityPostType,
  ReactionType,
} from '@campusly/shared-types';
import { db } from '../db/client.js';
import {
  communities,
  communityMembers,
  communityPosts,
  communityInvites,
  reactions,
  type CommunityRow,
  type CommunityMemberRow,
  type CommunityPostRow,
  type CommunityInviteRow,
} from '../db/schema.js';

/**
 * Data access for Communities & Clubs (DATABASE_SCHEMA.md §11). Community posts
 * mirror wall posts but scoped by community_id; reactions reuse the polymorphic
 * reactions table with target_type='community_post'.
 */
export const communityRepository = {
  // --- Communities ---
  async create(input: {
    universityId: string | null;
    name: string;
    slug: string;
    description: string | null;
    type: CommunityType;
    visibility: CommunityVisibility;
    createdBy: string;
  }): Promise<CommunityRow> {
    return db.transaction(async (tx) => {
      const [c] = await tx
        .insert(communities)
        .values({ ...input, memberCount: 1 })
        .returning();
      if (!c) throw new Error('Failed to create community');
      // Creator becomes the owner.
      await tx
        .insert(communityMembers)
        .values({ communityId: c.id, userId: input.createdBy, role: 'owner', status: 'active' });
      return c;
    });
  },

  async getById(id: string): Promise<CommunityRow | null> {
    const rows = await db.select().from(communities).where(eq(communities.id, id)).limit(1);
    const row = rows[0];
    return row && !row.deletedAt ? row : null;
  },

  async slugTaken(universityId: string | null, slug: string): Promise<boolean> {
    const rows = await db
      .select({ id: communities.id })
      .from(communities)
      .where(
        and(
          universityId
            ? eq(communities.universityId, universityId)
            : isNull(communities.universityId),
          eq(communities.slug, slug),
        ),
      )
      .limit(1);
    return rows.length > 0;
  },

  /** Browse communities visible to a campus (own campus + cross-campus). */
  async browse(input: {
    universityId: string;
    q?: string;
    cursor?: string;
    limit: number;
  }): Promise<CommunityRow[]> {
    const conditions = [
      isNull(communities.deletedAt),
      or(isNull(communities.universityId), eq(communities.universityId, input.universityId)),
    ];
    if (input.q) conditions.push(ilike(communities.name, `%${input.q.trim()}%`));
    if (input.cursor) conditions.push(lt(communities.createdAt, new Date(input.cursor)));
    return db
      .select()
      .from(communities)
      .where(and(...conditions))
      .orderBy(desc(communities.createdAt))
      .limit(input.limit);
  },

  async incMemberCount(communityId: string, delta: number): Promise<void> {
    await db
      .update(communities)
      .set({ memberCount: sql`greatest(${communities.memberCount} + ${delta}, 0)` })
      .where(eq(communities.id, communityId));
  },

  // --- Members ---
  async getMembership(communityId: string, userId: string): Promise<CommunityMemberRow | null> {
    const rows = await db
      .select()
      .from(communityMembers)
      .where(
        and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async addMember(
    communityId: string,
    userId: string,
    role: CommunityRole,
    status: 'active' | 'pending',
  ): Promise<void> {
    await db
      .insert(communityMembers)
      .values({ communityId, userId, role, status })
      .onConflictDoNothing();
  },

  async setMemberStatus(
    communityId: string,
    userId: string,
    status: 'active' | 'banned',
  ): Promise<void> {
    await db
      .update(communityMembers)
      .set({ status })
      .where(
        and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)),
      );
  },

  async setMemberRole(communityId: string, userId: string, role: CommunityRole): Promise<void> {
    await db
      .update(communityMembers)
      .set({ role })
      .where(
        and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)),
      );
  },

  async removeMember(communityId: string, userId: string): Promise<void> {
    await db
      .delete(communityMembers)
      .where(
        and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)),
      );
  },

  async listMembers(communityId: string): Promise<CommunityMemberRow[]> {
    return db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          inArray(communityMembers.status, ['active', 'pending']),
        ),
      )
      .orderBy(communityMembers.joinedAt);
  },

  /** Memberships for a set of communities for one user (browse list badges). */
  async myMemberships(
    userId: string,
    communityIds: string[],
  ): Promise<Map<string, CommunityMemberRow>> {
    const map = new Map<string, CommunityMemberRow>();
    if (communityIds.length === 0) return map;
    const rows = await db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.userId, userId),
          inArray(communityMembers.communityId, communityIds),
        ),
      );
    for (const r of rows) map.set(r.communityId, r);
    return map;
  },

  // --- Posts ---
  async insertPost(input: {
    communityId: string;
    authorId: string;
    isAnonymous: boolean;
    postType: CommunityPostType;
    body: string;
  }): Promise<CommunityPostRow> {
    const [row] = await db.insert(communityPosts).values(input).returning();
    if (!row) throw new Error('Failed to create community post');
    return row;
  },

  async getPostById(id: string): Promise<CommunityPostRow | null> {
    const rows = await db.select().from(communityPosts).where(eq(communityPosts.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async feed(
    communityId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommunityPostRow[]> {
    const conditions = [
      eq(communityPosts.communityId, communityId),
      eq(communityPosts.status, 'visible'),
      isNull(communityPosts.deletedAt),
    ];
    if (cursor) conditions.push(lt(communityPosts.createdAt, new Date(cursor)));
    return db
      .select()
      .from(communityPosts)
      .where(and(...conditions))
      .orderBy(desc(communityPosts.createdAt))
      .limit(limit);
  },

  async softDeletePost(id: string): Promise<void> {
    await db
      .update(communityPosts)
      .set({ status: 'removed', deletedAt: new Date() })
      .where(eq(communityPosts.id, id));
  },

  // --- Reactions (community_post, polymorphic) ---
  async react(userId: string, postId: string, type: ReactionType): Promise<number> {
    return db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: reactions.id })
        .from(reactions)
        .where(
          and(
            eq(reactions.userId, userId),
            eq(reactions.targetType, 'community_post'),
            eq(reactions.targetId, postId),
          ),
        )
        .limit(1);
      if (existing[0]) {
        await tx.update(reactions).set({ type }).where(eq(reactions.id, existing[0].id));
      } else {
        await tx
          .insert(reactions)
          .values({ userId, targetType: 'community_post', targetId: postId, type });
        await tx
          .update(communityPosts)
          .set({ reactionCount: sql`${communityPosts.reactionCount} + 1` })
          .where(eq(communityPosts.id, postId));
      }
      const rows = await tx
        .select({ c: communityPosts.reactionCount })
        .from(communityPosts)
        .where(eq(communityPosts.id, postId))
        .limit(1);
      return rows[0]?.c ?? 0;
    });
  },

  async unreact(userId: string, postId: string): Promise<number> {
    return db.transaction(async (tx) => {
      const deleted = await tx
        .delete(reactions)
        .where(
          and(
            eq(reactions.userId, userId),
            eq(reactions.targetType, 'community_post'),
            eq(reactions.targetId, postId),
          ),
        )
        .returning({ id: reactions.id });
      if (deleted.length > 0) {
        await tx
          .update(communityPosts)
          .set({ reactionCount: sql`greatest(${communityPosts.reactionCount} - 1, 0)` })
          .where(eq(communityPosts.id, postId));
      }
      const rows = await tx
        .select({ c: communityPosts.reactionCount })
        .from(communityPosts)
        .where(eq(communityPosts.id, postId))
        .limit(1);
      return rows[0]?.c ?? 0;
    });
  },

  async myReactions(userId: string, postIds: string[]): Promise<Map<string, ReactionType>> {
    const map = new Map<string, ReactionType>();
    if (postIds.length === 0) return map;
    const rows = await db
      .select({ targetId: reactions.targetId, type: reactions.type })
      .from(reactions)
      .where(
        and(
          eq(reactions.userId, userId),
          eq(reactions.targetType, 'community_post'),
          inArray(reactions.targetId, postIds),
        ),
      );
    for (const r of rows) map.set(r.targetId, r.type);
    return map;
  },

  // --- Invites ---
  async createInvite(
    communityId: string,
    inviterId: string,
    inviteeId: string,
  ): Promise<CommunityInviteRow> {
    const [row] = await db
      .insert(communityInvites)
      .values({ communityId, inviterId, inviteeId, status: 'pending' })
      .returning();
    if (!row) throw new Error('Failed to create invite');
    return row;
  },

  async getInviteById(id: string): Promise<CommunityInviteRow | null> {
    const rows = await db
      .select()
      .from(communityInvites)
      .where(eq(communityInvites.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async setInviteStatus(id: string, status: 'accepted' | 'declined'): Promise<void> {
    await db.update(communityInvites).set({ status }).where(eq(communityInvites.id, id));
  },

  async listIncomingInvites(userId: string): Promise<CommunityInviteRow[]> {
    return db
      .select()
      .from(communityInvites)
      .where(and(eq(communityInvites.inviteeId, userId), eq(communityInvites.status, 'pending')))
      .orderBy(desc(communityInvites.createdAt));
  },
};
