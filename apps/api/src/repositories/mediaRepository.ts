import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import type { MediaKind } from '@campusly/shared-types';
import { db } from '../db/client.js';
import {
  mediaAssets,
  messageAttachments,
  type MediaAssetRow,
  type MessageAttachmentRow,
} from '../db/schema.js';

/**
 * Data access for the media registry (DATABASE_SCHEMA.md §8.6, §20). Stores
 * references only — bytes live in object storage.
 */
export const mediaRepository = {
  async createPending(input: {
    ownerId: string;
    storageKey: string;
    kind: MediaKind;
    mimeType: string;
    sizeBytes: number;
    durationMs?: number;
    isTemporary: boolean;
  }): Promise<MediaAssetRow> {
    const [row] = await db
      .insert(mediaAssets)
      .values({
        ownerId: input.ownerId,
        storageKey: input.storageKey,
        kind: input.kind,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        durationMs: input.durationMs ?? null,
        isTemporary: input.isTemporary,
        status: 'pending',
      })
      .returning();
    if (!row) throw new Error('Failed to create media asset');
    return row;
  },

  async findById(id: string): Promise<MediaAssetRow | null> {
    const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findManyByIds(ids: string[]): Promise<MediaAssetRow[]> {
    if (ids.length === 0) return [];
    return db.select().from(mediaAssets).where(inArray(mediaAssets.id, ids));
  },

  /** Marks a pending asset active and sets the temporary expiry, if any. */
  async activate(id: string, expiresAt: Date | null): Promise<MediaAssetRow | null> {
    const [row] = await db
      .update(mediaAssets)
      .set({ status: 'active', expiresAt })
      .where(and(eq(mediaAssets.id, id), eq(mediaAssets.status, 'pending')))
      .returning();
    return row ?? null;
  },

  async markStatus(id: string, status: 'expired' | 'deleted'): Promise<void> {
    await db.update(mediaAssets).set({ status }).where(eq(mediaAssets.id, id));
  },

  /** Active temporary assets whose deadline has passed (cleanup job). */
  async findExpired(now: Date, limit = 200): Promise<MediaAssetRow[]> {
    return db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.isTemporary, true),
          eq(mediaAssets.status, 'active'),
          lt(mediaAssets.expiresAt, now),
        ),
      )
      .limit(limit);
  },

  /** Orphaned pending uploads older than the cutoff (never confirmed). */
  async findStalePending(cutoff: Date, limit = 200): Promise<MediaAssetRow[]> {
    return db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.status, 'pending'), lt(mediaAssets.createdAt, cutoff)))
      .limit(limit);
  },

  // --- Attachments ---

  async addAttachment(messageId: string, mediaId: string): Promise<MessageAttachmentRow> {
    const [row] = await db.insert(messageAttachments).values({ messageId, mediaId }).returning();
    if (!row) throw new Error('Failed to create attachment');
    return row;
  },

  /** Attachment (with its media) for a set of messages, keyed by message id. */
  async attachmentsForMessages(messageIds: string[]): Promise<Map<string, MediaAssetRow>> {
    const map = new Map<string, MediaAssetRow>();
    if (messageIds.length === 0) return map;
    const rows = await db
      .select({ messageId: messageAttachments.messageId, media: mediaAssets })
      .from(messageAttachments)
      .innerJoin(mediaAssets, eq(mediaAssets.id, messageAttachments.mediaId))
      .where(inArray(messageAttachments.messageId, messageIds));
    for (const r of rows) map.set(r.messageId, r.media);
    return map;
  },

  /** Message ids that reference a given media asset (for expiry notifications). */
  async messageIdsForMedia(mediaId: string): Promise<string[]> {
    const rows = await db
      .select({ messageId: messageAttachments.messageId })
      .from(messageAttachments)
      .where(eq(messageAttachments.mediaId, mediaId));
    return rows.map((r) => r.messageId);
  },

  async countActive(): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mediaAssets)
      .where(eq(mediaAssets.status, 'active'));
    return rows[0]?.count ?? 0;
  },
};
