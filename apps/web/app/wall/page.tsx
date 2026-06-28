'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <div className="shrink-0">
        <AppNav />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-space-4 md:px-space-8 py-space-5 pb-24 md:pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-6 items-start">
            {/* Left Sidebar — Desktop only */}
            <aside className="hidden md:flex flex-col gap-space-5 md:col-span-1 sticky top-24">
              {/* User Profile Card */}
              <div className="rounded-card border border-border bg-surface p-space-5 flex flex-col gap-space-4 shadow-sm">
                <div className="flex items-center gap-space-3">
                  <div className="h-12 w-12 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-display text-h3 font-bold select-none">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-foreground text-body truncate">
                      {user.name}
                    </span>
                    <span className="text-small text-muted-foreground truncate max-w-[180px]">
                      {user.email}
                    </span>
                  </div>
                </div>
                <div className="border-t border-border/60 pt-space-3 flex flex-col gap-space-2 text-small text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Role</span>
                    <span className="text-foreground font-medium capitalize">
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tier</span>
                    <span className="text-brand font-semibold capitalize">
                      {user.subscriptionStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Match Promo Card */}
              <div className="rounded-card border border-border bg-surface p-space-5 flex flex-col gap-space-3 shadow-sm">
                <h3 className="font-display text-h3 text-foreground">Ready to connect?</h3>
                <p className="text-caption text-muted-foreground">
                  Start an anonymous session to meet new peers from your university.
                </p>
                <Link
                  href="/match"
                  className="inline-flex h-9 items-center justify-center rounded-button bg-brand text-small font-semibold text-brand-foreground hover:scale-[1.01] active:scale-95 transition-all mt-space-2 select-none"
                >
                  Match Now
                </Link>
              </div>
            </aside>

            {/* Right Feed Column */}
            <section className="col-span-1 md:col-span-2 flex flex-col gap-space-5">
              <div className="flex flex-col gap-space-1">
                <h1 className="text-h1 text-foreground">Campus Wall</h1>
                <p className="text-body text-muted-foreground">
                  What&apos;s happening on your campus.
                </p>
              </div>
              <Composer
                categories={categories}
                onCreated={(post) =>
                  setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [post, ...prev]))
                }
              />

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
                    'rounded-tooltip px-space-3 py-1 text-small transition-colors',
                    categoryId === ''
                      ? 'bg-brand text-brand-foreground font-semibold'
                      : 'bg-surface text-muted-foreground hover:text-foreground',
                  )}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      'rounded-tooltip px-space-3 py-1 text-small transition-colors',
                      categoryId === c.id
                        ? 'bg-brand text-brand-foreground font-semibold'
                        : 'bg-surface text-muted-foreground hover:text-foreground',
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
                <Button
                  variant="secondary"
                  disabled={loading}
                  onClick={() => void load(false)}
                  className="w-full"
                >
                  {loading ? 'Loading…' : 'Load more'}
                </Button>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
