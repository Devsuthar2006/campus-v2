'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WallPost, WallCategory, WallFeedMode } from '@campusly/shared-types';
import { WALL_SERVER_EVENTS } from '@campusly/shared-types';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { wallApi } from '../../lib/wall';
import { connectSocket, getSocket } from '../../lib/socket';
import { AppNav } from '../../components/AppNav';
import { Composer } from '../../components/wall/Composer';
import { PostCard } from '../../components/wall/PostCard';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

/**
 * Campus Wall feed (PUBLIC_WALL.md §5): latest/trending toggle, category filter,
 * compose, infinite scroll via cursor, and realtime new-post fan-out.
 */
export default function WallPage() {
  const { user, isLoading } = useRequireAuth();
  const [mode, setMode] = useState<WallFeedMode>('latest');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<WallCategory[]>([]);
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void wallApi.categories().then(setCategories);
  }, []);

  const load = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      try {
        const res = await wallApi.feed({
          mode,
          categoryId: categoryId || undefined,
          cursor: reset ? undefined : (cursor ?? undefined),
        });
        setPosts((prev) => (reset ? res.posts : [...prev, ...res.posts]));
        setCursor(res.nextCursor);
      } finally {
        setLoading(false);
      }
    },
    [mode, categoryId, cursor],
  );

  // Reload when mode/category changes.
  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, categoryId]);

  // Realtime: prepend new posts on this campus (latest mode only).
  useEffect(() => {
    const socket = connectSocket();
    const onNew = (payload: { post: WallPost }) => {
      if (mode !== 'latest' || categoryId) return;
      setPosts((prev) =>
        prev.some((p) => p.id === payload.post.id) ? prev : [payload.post, ...prev],
      );
    };
    const onDeleted = (payload: { postId: string }) => {
      setPosts((prev) => prev.filter((p) => p.id !== payload.postId));
    };
    socket.on(WALL_SERVER_EVENTS.NEW_POST, onNew);
    socket.on(WALL_SERVER_EVENTS.POST_DELETED, onDeleted);
    return () => {
      socket.off(WALL_SERVER_EVENTS.NEW_POST, onNew);
      socket.off(WALL_SERVER_EVENTS.POST_DELETED, onDeleted);
    };
  }, [mode, categoryId]);

  useEffect(() => {
    getSocket();
  }, []);

  if (isLoading || !user) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-space-5 px-space-4 py-space-8 md:px-space-8">
      <AppNav />
      <div className="flex flex-col gap-space-1">
        <h1 className="text-h1 text-foreground">Campus Wall</h1>
        <p className="text-body text-muted-foreground">What&apos;s happening on your campus.</p>
      </div>

      <Composer categories={categories} onCreated={(post) => setPosts((prev) => [post, ...prev])} />

      <div className="flex items-center gap-space-2">
        {(['latest', 'trending'] as const).map((m) => (
          <Button
            key={m}
            variant={mode === m ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode(m)}
          >
            {m === 'latest' ? 'Latest' : 'Trending'}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-space-1">
        <button
          onClick={() => setCategoryId('')}
          className={cn(
            'rounded-tooltip px-space-2 py-0.5 text-small',
            categoryId === ''
              ? 'bg-brand text-brand-foreground'
              : 'bg-surface text-muted-foreground',
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={cn(
              'rounded-tooltip px-space-2 py-0.5 text-small',
              categoryId === c.id
                ? 'bg-brand text-brand-foreground'
                : 'bg-surface text-muted-foreground',
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-space-3">
        {posts.length === 0 && !loading && (
          <p className="py-space-8 text-center text-caption text-muted-foreground">
            Nothing here yet. Be the first to post.
          </p>
        )}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            selfId={user.id}
            onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          />
        ))}
      </div>

      {mode === 'latest' && cursor && (
        <Button variant="secondary" disabled={loading} onClick={() => void load(false)}>
          {loading ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </main>
  );
}
