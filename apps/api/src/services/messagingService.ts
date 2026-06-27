import type { ChatMessage, ChatAttachment, MessageContextType } from '@campusly/shared-types';
import { ForbiddenError } from '../domain/errors.js';
import type { MessageRow, MediaAssetRow } from '../db/schema.js';
import { messagingRepository } from '../repositories/messagingRepository.js';
import { matchingRepository } from '../repositories/matchingRepository.js';
import { friendRepository } from '../repositories/friendRepository.js';
import { mediaRepository } from '../repositories/mediaRepository.js';

/**
 * Messaging business logic (ARCHITECTURE.md §6). Transport-agnostic: the same
 * service serves Socket.IO and REST. Phase 04 wired the anon_session context;
 * Phase 05 activated the friendship context; Phase 06 attaches media references
 * (voice/image/video) — bytes never touch this path.
 */

function toAttachment(media: MediaAssetRow): ChatAttachment {
  return {
    mediaId: media.id,
    kind: media.kind,
    mimeType: media.mimeType,
    durationMs: media.durationMs,
    expiresAt: media.expiresAt ? media.expiresAt.toISOString() : null,
  };
}

function toChatMessage(row: MessageRow, attachment?: MediaAssetRow | null): ChatMessage {
  return {
    id: row.id,
    contextType: row.contextType,
    contextId: (row.sessionId ?? row.friendshipId) as string,
    senderId: row.senderId,
    type: row.type,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    attachment: attachment ? toAttachment(attachment) : null,
  };
}

export const messagingService = {
  /** True if the user may read/write this conversation. */
  async authorize(
    userId: string,
    contextType: MessageContextType,
    contextId: string,
  ): Promise<boolean> {
    if (contextType === 'anon_session') {
      return matchingRepository.isParticipant(contextId, userId);
    }
    // friendship context (Phase 05): must be an active friendship the user is
    // part of, with neither party blocking the other (block-aware).
    const friendship = await friendRepository.getFriendshipById(contextId);
    if (!friendship || friendship.deletedAt) return false;
    if (friendship.userLow !== userId && friendship.userHigh !== userId) return false;
    const otherId = friendship.userLow === userId ? friendship.userHigh : friendship.userLow;
    if (await friendRepository.isBlockedEitherWay(userId, otherId)) return false;
    return true;
  },

  /** The user ids that should receive events for this conversation. */
  async recipients(contextType: MessageContextType, contextId: string): Promise<string[]> {
    if (contextType === 'anon_session') {
      return matchingRepository.getParticipants(contextId);
    }
    const friendship = await friendRepository.getFriendshipById(contextId);
    if (!friendship || friendship.deletedAt) return [];
    // Suppress delivery if a block is in effect (defense in depth).
    if (await friendRepository.isBlockedEitherWay(friendship.userLow, friendship.userHigh)) {
      return [];
    }
    return [friendship.userLow, friendship.userHigh];
  },

  async assertAuthorized(
    userId: string,
    contextType: MessageContextType,
    contextId: string,
  ): Promise<void> {
    if (!(await this.authorize(userId, contextType, contextId))) {
      throw new ForbiddenError('You are not a participant in this conversation.');
    }
  },

  /** Persist a text message; returns the stored message and who should receive it. */
  async sendMessage(
    senderId: string,
    input: { contextType: MessageContextType; contextId: string; body: string },
  ): Promise<{ message: ChatMessage; recipients: string[] }> {
    await this.assertAuthorized(senderId, input.contextType, input.contextId);
    const row = await messagingRepository.insert({
      contextType: input.contextType,
      contextId: input.contextId,
      senderId,
      body: input.body,
    });
    const recipients = await this.recipients(input.contextType, input.contextId);
    return { message: toChatMessage(row), recipients };
  },

  /**
   * Persist a media message (voice/image/video) referencing a confirmed media
   * asset (MEDIA_SYSTEM.md §6–7). The asset must be active and owned by the
   * sender; bytes already live in object storage. Video uses message type
   * 'image' (visual media) with the attachment kind disambiguating.
   */
  async sendMediaMessage(
    senderId: string,
    input: { contextType: MessageContextType; contextId: string; mediaId: string },
  ): Promise<{ message: ChatMessage; recipients: string[] }> {
    await this.assertAuthorized(senderId, input.contextType, input.contextId);
    const media = await mediaRepository.findById(input.mediaId);
    if (!media || media.status !== 'active') {
      throw new ForbiddenError('That media is not available.');
    }
    if (media.ownerId !== senderId) {
      throw new ForbiddenError('You can only attach your own media.');
    }
    const type = media.kind === 'voice' ? 'voice' : 'image';
    const row = await messagingRepository.insert({
      contextType: input.contextType,
      contextId: input.contextId,
      senderId,
      type,
    });
    await mediaRepository.addAttachment(row.id, media.id);
    const recipients = await this.recipients(input.contextType, input.contextId);
    return { message: toChatMessage(row, media), recipients };
  },

  async markRead(
    userId: string,
    contextType: MessageContextType,
    contextId: string,
    lastReadMessageId: string,
  ): Promise<string[]> {
    await this.assertAuthorized(userId, contextType, contextId);
    await messagingRepository.upsertReceipt({ userId, contextType, contextId, lastReadMessageId });
    return this.recipients(contextType, contextId);
  },

  /** Paginated history (newest-first from DB, returned chronological for display). */
  async history(
    userId: string,
    query: { contextType: MessageContextType; contextId: string; cursor?: string; limit: number },
  ): Promise<{ messages: ChatMessage[]; nextCursor: string | null }> {
    await this.assertAuthorized(userId, query.contextType, query.contextId);
    const rows = await messagingRepository.history(query);
    const nextCursor =
      rows.length === query.limit ? (rows[rows.length - 1]?.createdAt.toISOString() ?? null) : null;
    const attachments = await mediaRepository.attachmentsForMessages(rows.map((r) => r.id));
    return {
      messages: rows.reverse().map((r) => toChatMessage(r, attachments.get(r.id) ?? null)),
      nextCursor,
    };
  },
};
