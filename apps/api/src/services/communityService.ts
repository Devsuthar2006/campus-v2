import type {
  AccessTokenClaims,
  Community,
  CommunityMember,
  CommunityPost,
  CommunityInvite,
  CreateCommunityInput,
  CreateCommunityPostInput,
  CommunityRole,
  ReactionType,
  MyMembership,
} from '@campusly/shared-types';
import { ConflictError, ForbiddenError, NotFoundError } from '../domain/errors.js';
import type { CommunityRow, CommunityMemberRow, CommunityPostRow } from '../db/schema.js';
import { communityRepository } from '../repositories/communityRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { reportRepository } from '../repositories/reportRepository.js';

/**
 * Communities & Clubs business logic (DATABASE_SCHEMA.md §11, PUBLIC_WALL.md
 * post patterns). Role-based authorization (owner/moderator/member) gates
 * community actions; community moderators act within platform rules.
 */
const MOD_ROLES: CommunityRole[] = ['owner', 'moderator'];

export const communityService = {
  async create(claims: AccessTokenClaims, input: CreateCommunityInput): Promise<Community> {
    if (await communityRepository.slugTaken(claims.universityId, input.slug)) {
      throw new ConflictError('That community URL is already taken on your campus.');
    }
    const row = await communityRepository.create({
      universityId: claims.universityId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      type: input.type,
      visibility: input.visibility,
      createdBy: claims.sub,
    });
    return this.toCommunity(row, { role: 'owner', status: 'active' });
  },

  async browse(
    claims: AccessTokenClaims,
    query: { q?: string; cursor?: string; limit: number },
  ): Promise<{ communities: Community[]; nextCursor: string | null }> {
    const rows = await communityRepository.browse({
      universityId: claims.universityId,
      q: query.q,
      cursor: query.cursor,
      limit: query.limit,
    });
    const memberships = await communityRepository.myMemberships(
      claims.sub,
      rows.map((r) => r.id),
    );
    const communities = rows.map((r) => this.toCommunity(r, membershipDto(memberships.get(r.id))));
    const nextCursor =
      rows.length === query.limit ? (rows[rows.length - 1]?.createdAt.toISOString() ?? null) : null;
    return { communities, nextCursor };
  },

  async detail(claims: AccessTokenClaims, id: string): Promise<Community> {
    const row = await this.requireCommunity(id);
    const membership = await communityRepository.getMembership(id, claims.sub);
    return this.toCommunity(row, membershipDto(membership));
  },

  /** Join (public → active; request → pending; invite → must be invited). */
  async join(claims: AccessTokenClaims, id: string): Promise<MyMembership> {
    const community = await this.requireCommunity(id);
    const existing = await communityRepository.getMembership(id, claims.sub);
    if (existing && existing.status === 'banned') {
      throw new ForbiddenError('You cannot join this community.');
    }
    if (existing && existing.status === 'active') return { role: existing.role, status: 'active' };

    if (community.visibility === 'invite') {
      throw new ForbiddenError('This community is invite-only.');
    }
    const status = community.visibility === 'public' ? 'active' : 'pending';
    await communityRepository.addMember(id, claims.sub, 'member', status);
    if (status === 'active') await communityRepository.incMemberCount(id, 1);
    return { role: 'member', status };
  },

  async leave(claims: AccessTokenClaims, id: string): Promise<void> {
    const membership = await communityRepository.getMembership(id, claims.sub);
    if (!membership) return;
    if (membership.role === 'owner') {
      throw new ForbiddenError('Owners cannot leave; transfer ownership or delete the community.');
    }
    await communityRepository.removeMember(id, claims.sub);
    if (membership.status === 'active') await communityRepository.incMemberCount(id, -1);
  },

  async members(claims: AccessTokenClaims, id: string): Promise<CommunityMember[]> {
    const community = await this.requireCommunity(id);
    if (community.visibility !== 'public') await this.requireActiveMember(id, claims.sub);
    const rows = await communityRepository.listMembers(id);
    const summaries = await userRepository.getPublicSummaries(rows.map((r) => r.userId));
    return rows.flatMap((r) => {
      const s = summaries.get(r.userId);
      return s
        ? [
            {
              userId: r.userId,
              name: s.name,
              avatarMediaId: s.avatarMediaId,
              role: r.role,
              status: r.status,
              joinedAt: r.joinedAt.toISOString(),
            },
          ]
        : [];
    });
  },

  async feed(
    claims: AccessTokenClaims,
    id: string,
    query: { cursor?: string; limit: number },
  ): Promise<{ posts: CommunityPost[]; nextCursor: string | null }> {
    const community = await this.requireCommunity(id);
    if (community.visibility !== 'public') await this.requireActiveMember(id, claims.sub);
    const rows = await communityRepository.feed(id, query.cursor, query.limit);
    const posts = await this.assemblePosts(claims.sub, rows);
    const nextCursor =
      rows.length === query.limit ? (rows[rows.length - 1]?.createdAt.toISOString() ?? null) : null;
    return { posts, nextCursor };
  },

  async createPost(
    claims: AccessTokenClaims,
    id: string,
    input: CreateCommunityPostInput,
  ): Promise<CommunityPost> {
    await this.requireCommunity(id);
    const membership = await this.requireActiveMember(id, claims.sub);
    if (input.postType === 'announcement' && !MOD_ROLES.includes(membership.role)) {
      throw new ForbiddenError('Only owners and moderators can post announcements.');
    }
    const row = await communityRepository.insertPost({
      communityId: id,
      authorId: claims.sub,
      isAnonymous: input.isAnonymous,
      postType: input.postType,
      body: input.body,
    });
    const [post] = await this.assemblePosts(claims.sub, [row]);
    if (!post) throw new Error('Failed to assemble post');
    return post;
  },

  async deletePost(claims: AccessTokenClaims, postId: string): Promise<void> {
    const post = await communityRepository.getPostById(postId);
    if (!post || post.deletedAt) throw new NotFoundError('Post not found.');
    const membership = await communityRepository.getMembership(post.communityId, claims.sub);
    const isMod =
      membership && membership.status === 'active' && MOD_ROLES.includes(membership.role);
    if (post.authorId !== claims.sub && !isMod) {
      throw new ForbiddenError('You cannot delete this post.');
    }
    await communityRepository.softDeletePost(postId);
  },

  async react(
    claims: AccessTokenClaims,
    postId: string,
    type: ReactionType,
  ): Promise<{ count: number }> {
    const post = await this.requirePost(postId);
    await this.requireActiveMember(post.communityId, claims.sub);
    const count = await communityRepository.react(claims.sub, postId, type);
    return { count };
  },

  async unreact(claims: AccessTokenClaims, postId: string): Promise<{ count: number }> {
    const post = await this.requirePost(postId);
    await this.requireActiveMember(post.communityId, claims.sub);
    const count = await communityRepository.unreact(claims.sub, postId);
    return { count };
  },

  // --- Member management ---
  async approveMember(claims: AccessTokenClaims, id: string, userId: string): Promise<void> {
    await this.requireModerator(id, claims.sub);
    const membership = await communityRepository.getMembership(id, userId);
    if (!membership || membership.status !== 'pending')
      throw new NotFoundError('No pending request.');
    await communityRepository.setMemberStatus(id, userId, 'active');
    await communityRepository.incMemberCount(id, 1);
  },

  async changeRole(
    claims: AccessTokenClaims,
    id: string,
    userId: string,
    role: 'moderator' | 'member',
  ): Promise<void> {
    await this.requireOwner(id, claims.sub);
    const membership = await communityRepository.getMembership(id, userId);
    if (!membership || membership.status !== 'active') throw new NotFoundError('Member not found.');
    if (membership.role === 'owner') throw new ForbiddenError('Cannot change the owner role.');
    await communityRepository.setMemberRole(id, userId, role);
  },

  async removeMember(claims: AccessTokenClaims, id: string, userId: string): Promise<void> {
    await this.requireModerator(id, claims.sub);
    const membership = await communityRepository.getMembership(id, userId);
    if (!membership) throw new NotFoundError('Member not found.');
    if (membership.role === 'owner') throw new ForbiddenError('Cannot remove the owner.');
    await communityRepository.removeMember(id, userId);
    if (membership.status === 'active') await communityRepository.incMemberCount(id, -1);
  },

  // --- Invites ---
  async invite(claims: AccessTokenClaims, id: string, inviteeId: string): Promise<CommunityInvite> {
    await this.requireModerator(id, claims.sub);
    const invitee = await userRepository.findById(inviteeId);
    if (!invitee || invitee.deletedAt) throw new NotFoundError('User not found.');
    const existing = await communityRepository.getMembership(id, inviteeId);
    if (existing && existing.status === 'active') throw new ConflictError('Already a member.');
    const row = await communityRepository.createInvite(id, claims.sub, inviteeId);
    const community = await communityRepository.getById(id);
    return {
      id: row.id,
      community: { id, name: community?.name ?? '', slug: community?.slug ?? '' },
      inviterId: row.inviterId,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  },

  async respondInvite(claims: AccessTokenClaims, inviteId: string, accept: boolean): Promise<void> {
    const invite = await communityRepository.getInviteById(inviteId);
    if (!invite || invite.status !== 'pending') throw new NotFoundError('Invite not found.');
    if (invite.inviteeId !== claims.sub) throw new ForbiddenError('Not your invite.');
    await communityRepository.setInviteStatus(inviteId, accept ? 'accepted' : 'declined');
    if (accept) {
      await communityRepository.addMember(invite.communityId, claims.sub, 'member', 'active');
      await communityRepository.incMemberCount(invite.communityId, 1);
    }
  },

  async listInvites(claims: AccessTokenClaims): Promise<CommunityInvite[]> {
    const rows = await communityRepository.listIncomingInvites(claims.sub);
    const out: CommunityInvite[] = [];
    for (const r of rows) {
      const community = await communityRepository.getById(r.communityId);
      if (community) {
        out.push({
          id: r.id,
          community: { id: community.id, name: community.name, slug: community.slug },
          inviterId: r.inviterId,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        });
      }
    }
    return out;
  },

  async report(
    claims: AccessTokenClaims,
    postId: string,
    reason: 'spam' | 'harassment' | 'hate' | 'nsfw' | 'safety' | 'other',
    details?: string,
  ): Promise<void> {
    await this.requirePost(postId);
    await reportRepository.create({
      reporterId: claims.sub,
      targetType: 'community_post',
      targetId: postId,
      reason,
      details,
    });
  },

  // --- internal ---
  async requireCommunity(id: string): Promise<CommunityRow> {
    const row = await communityRepository.getById(id);
    if (!row) throw new NotFoundError('Community not found.');
    return row;
  },

  async requirePost(postId: string): Promise<CommunityPostRow> {
    const post = await communityRepository.getPostById(postId);
    if (!post || post.deletedAt || post.status !== 'visible')
      throw new NotFoundError('Post not found.');
    return post;
  },

  async requireActiveMember(communityId: string, userId: string): Promise<CommunityMemberRow> {
    const m = await communityRepository.getMembership(communityId, userId);
    if (!m || m.status !== 'active') throw new ForbiddenError('Join this community first.');
    return m;
  },

  async requireModerator(communityId: string, userId: string): Promise<CommunityMemberRow> {
    const m = await this.requireActiveMember(communityId, userId);
    if (!MOD_ROLES.includes(m.role)) throw new ForbiddenError('Requires moderator privileges.');
    return m;
  },

  async requireOwner(communityId: string, userId: string): Promise<CommunityMemberRow> {
    const m = await this.requireActiveMember(communityId, userId);
    if (m.role !== 'owner') throw new ForbiddenError('Requires owner privileges.');
    return m;
  },

  toCommunity(row: CommunityRow, myMembership: MyMembership | null): Community {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      type: row.type,
      visibility: row.visibility,
      isVerified: row.isVerified,
      iconMediaId: row.iconMediaId,
      memberCount: row.memberCount,
      createdAt: row.createdAt.toISOString(),
      myMembership,
    };
  },

  async assemblePosts(viewerId: string, rows: CommunityPostRow[]): Promise<CommunityPost[]> {
    if (rows.length === 0) return [];
    const authorIds = rows.filter((r) => !r.isAnonymous).map((r) => r.authorId);
    const [authors, myReactions] = await Promise.all([
      userRepository.getPublicSummaries(authorIds),
      communityRepository.myReactions(
        viewerId,
        rows.map((r) => r.id),
      ),
    ]);
    return rows.map((r) => {
      const s = r.isAnonymous ? undefined : authors.get(r.authorId);
      return {
        id: r.id,
        communityId: r.communityId,
        author: s ? { id: s.id, name: s.name, avatarMediaId: s.avatarMediaId } : null,
        isAnonymous: r.isAnonymous,
        postType: r.postType,
        body: r.body,
        reactionCount: r.reactionCount,
        myReaction: (myReactions.get(r.id) as ReactionType | undefined) ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    });
  },
};

function membershipDto(m: CommunityMemberRow | undefined | null): MyMembership | null {
  return m ? { role: m.role, status: m.status } : null;
}
