import type { ReportRow } from '../db/schema.js';
import { db } from '../db/client.js';
import { reports } from '../db/schema.js';

/**
 * Report persistence — the moderation hook (DATABASE_SCHEMA.md §15.1). Phase 07
 * files reports into this table; the moderation tooling that consumes the queue
 * (review, actions, appeals) lands in Phase 12.
 */
type ReportTargetType =
  | 'user'
  | 'wall_post'
  | 'wall_reply'
  | 'community_post'
  | 'message'
  | 'marketplace_item'
  | 'lost_found_item';

export const reportRepository = {
  async create(input: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: 'spam' | 'harassment' | 'hate' | 'nsfw' | 'safety' | 'other';
    details?: string;
  }): Promise<ReportRow> {
    const [row] = await db
      .insert(reports)
      .values({
        reporterId: input.reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details ?? null,
      })
      .returning();
    if (!row) throw new Error('Failed to file report');
    return row;
  },
};
