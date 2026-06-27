import { and, desc, eq, lt, isNull, sql } from 'drizzle-orm';
import type { MessageContextType } from '@campusly/shared-types';
import { db } from '../db/client.js';
import { messages, messageReceipts, type MessageRow } from '../db/schema.js';

/**
 * Data access for messaging (DATABASE_SCHEMA.md §8). A message belongs to one
 * context; the contextId maps to session_id or friendship_id by context_type.
 */
function contextColumns(contextType: MessageContextType, contextId: string) {
  return contextType === 'anon_session'
    ? { sessionId: contextId, friendshipId: null }
    : { sessionId: null, friendshipId: contextId };
}

export const messagingRepository = {
  async insert(input: {
    contextType: MessageContextType;
    contextId: string;
    senderId: string;
    type?: 'text' | 'voice' | 'image' | 'system';
    body?: string | null;
  }): Promise<MessageRow> {
    const [row] = await db
      .insert(messages)
      .values({
        contextType: input.contextType,
        ...contextColumns(input.contextType, input.contextId),
        senderId: input.senderId,
        type: (input.type ?? 'text') as MessageRow['type'],
        body: input.body ?? null,
      })
      .returning();
    if (!row) throw new Error('Failed to persist message');
    return row;
  },

  /**
   * Cursor-paginated history, newest-first (API_SPEC.md §2.4). Cursor is the
   * created_at ISO timestamp of the oldest row already loaded.
   */
  async history(input: {
    contextType: MessageContextType;
    contextId: string;
    cursor?: string;
    limit: number;
  }): Promise<MessageRow[]> {
    const col = input.contextType === 'anon_session' ? messages.sessionId : messages.friendshipId;
    const conditions = [
      eq(messages.contextType, input.contextType),
      eq(col, input.contextId),
      isNull(messages.deletedAt),
    ];
    if (input.cursor) conditions.push(lt(messages.createdAt, new Date(input.cursor)));
    return db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(input.limit);
  },

  /** The context (type + id) for a message, looked up by its id (soft pointer). */
  async findContextByMessageId(
    messageId: string,
  ): Promise<{ contextType: MessageContextType; contextId: string } | null> {
    const rows = await db
      .select({
        contextType: messages.contextType,
        sessionId: messages.sessionId,
        friendshipId: messages.friendshipId,
      })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const contextId = row.contextType === 'anon_session' ? row.sessionId : row.friendshipId;
    if (!contextId) return null;
    return { contextType: row.contextType, contextId };
  },

  /** Upserts a read high-water mark for a user in a conversation (§8.4, M-2). */
  async upsertReceipt(input: {
    userId: string;
    contextType: MessageContextType;
    contextId: string;
    lastReadMessageId: string;
  }): Promise<void> {
    const cols = contextColumns(input.contextType, input.contextId);
    await db
      .insert(messageReceipts)
      .values({
        userId: input.userId,
        contextType: input.contextType,
        ...cols,
        lastReadMessageId: input.lastReadMessageId,
        lastReadAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          messageReceipts.userId,
          messageReceipts.contextType,
          messageReceipts.sessionId,
          messageReceipts.friendshipId,
        ],
        set: {
          lastReadMessageId: input.lastReadMessageId,
          lastReadAt: new Date(),
          updatedAt: sql`now()`,
        },
      });
  },
};
