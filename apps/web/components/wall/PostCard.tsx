'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { WallPost } from '@campusly/shared-types';
import { Heart, MessageCircle, Bookmark, Flag, Trash2 } from 'lucide-react';
import { wallApi } from '../../lib/wall';
import { MediaAttachment } from '../MediaAttachment';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

/**
 * A single wall post (PUBLIC_WALL.md §6, UI_GUIDELINES.md §12): author/anonymous
 * header, body, media, poll, tags, and a supportive reaction bar (no clout
 * scores). Self-contained optimistic actions; reports content for moderation.
 */
export function PostCard({
  post: initial,
  selfId,
  onDeleted,
  showReplyLink = true,
}: {
  post: WallPost;
  selfId: string;
  onDeleted?: (id: string) => void;
  showReplyLink?: boolean;
}) {
  const [post, setPost] = useState<WallPost>(initial);
  const [reported, setReported] = useState(false);
  const isMine = post.author?.id === selfId;

  const toggleReaction = async () => {
    if (post.myReaction) {
      const { count } = await wallApi.unreact(post.id, 'wall_post');
      setPost((p) => ({ ...p, myReaction: null, reactionCount: count }));
    } else {
      const { count } = await wallApi.react(post.id, 'wall_post', 'like');
      setPost((p) => ({ ...p, myReaction: 'like', reactionCount: count }));
    }
  };

  const toggleBookmark = async () => {
    if (post.bookmarked) {
      await wallApi.unbookmark(post.id);
      setPost((p) => ({ ...p, bookmarked: false }));
    } else {
      await wallApi.bookmark(post.id);
      setPost((p) => ({ ...p, bookmarked: true }));
    }
  };

  const vote = async (optionId: string) => {
    const updated = await wallApi.vote(post.id, optionId);
    setPost(updated);
  };

  const remove = async () => {
    await wallApi.deletePost(post.id);
    onDeleted?.(post.id);
  };

  const report = async () => {
    await wallApi.report(post.id, 'wall_post', post.id, 'other');
    setReported(true);
  };

  const totalVotes = post.poll?.reduce((s, o) => s + o.voteCount, 0) ?? 0;

  return (
    <Card className="flex flex-col gap-space-3">
      <div className="flex items-center justify-between gap-space-2">
        <div className="flex items-center gap-space-2">
          <span className="text-body font-medium text-foreground">
            {post.isAnonymous ? 'Anonymous' : (post.author?.name ?? 'Student')}
          </span>
          {post.category && (
            <span className="rounded-tooltip bg-surface px-space-2 py-0.5 text-small text-muted-foreground">
              {post.category.name}
            </span>
          )}
          {post.postType === 'announcement' && (
            <span className="rounded-tooltip bg-brand px-space-2 py-0.5 text-small text-brand-foreground">
              Announcement
            </span>
          )}
        </div>
        <time className="text-small text-muted-foreground">
          {new Date(post.createdAt).toLocaleDateString()}
        </time>
      </div>

      {post.body && <p className="whitespace-pre-wrap text-body text-foreground">{post.body}</p>}

      {post.mediaIds.length > 0 && (
        <div className="flex flex-col gap-space-2">
          {post.mediaIds.map((mediaId) => (
            <MediaAttachment
              key={mediaId}
              attachment={{
                mediaId,
                kind: 'image',
                mimeType: 'image/*',
                durationMs: null,
                expiresAt: null,
              }}
            />
          ))}
        </div>
      )}

      {post.poll && (
        <div className="flex flex-col gap-space-2">
          {post.poll.map((opt) => {
            const pct = totalVotes ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
            const mine = post.myVoteOptionId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => void vote(opt.id)}
                className={cn(
                  'relative overflow-hidden rounded-button border px-space-3 py-space-2 text-left text-body',
                  mine ? 'border-brand text-foreground' : 'border-border text-foreground',
                )}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-surface"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
                <span className="relative flex justify-between gap-space-2">
                  <span>{opt.text}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </span>
              </button>
            );
          })}
          <span className="text-small text-muted-foreground">{totalVotes} votes</span>
        </div>
      )}

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-space-1">
          {post.tags.map((t) => (
            <span key={t} className="text-small text-brand">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-space-1 border-t border-border pt-space-2">
        <Button variant="ghost" size="sm" onClick={() => void toggleReaction()} aria-label="Like">
          <Heart className={cn('h-4 w-4', post.myReaction && 'fill-brand text-brand')} />
          <span className="ml-space-1 text-small">{post.reactionCount}</span>
        </Button>
        {showReplyLink && (
          <Link href={`/wall/${post.id}`}>
            <Button variant="ghost" size="sm" aria-label="Replies">
              <MessageCircle className="h-4 w-4" />
              <span className="ml-space-1 text-small">{post.replyCount}</span>
            </Button>
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void toggleBookmark()}
          aria-label="Bookmark"
        >
          <Bookmark
            className={cn('h-4 w-4', post.bookmarked && 'fill-foreground text-foreground')}
          />
        </Button>
        <div className="ml-auto flex items-center gap-space-1">
          {!reported && (
            <Button variant="ghost" size="sm" onClick={() => void report()} aria-label="Report">
              <Flag className="h-4 w-4" />
            </Button>
          )}
          {reported && <span className="text-small text-muted-foreground">Reported</span>}
          {isMine && (
            <Button variant="ghost" size="sm" onClick={() => void remove()} aria-label="Delete">
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
