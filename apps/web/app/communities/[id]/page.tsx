'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Community, CommunityMember, CommunityPost } from '@campusly/shared-types';
import { Heart, Trash2 } from 'lucide-react';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { communitiesApi } from '../../../lib/communities';
import { AppNav } from '../../../components/AppNav';
import { Card, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/Textarea';
import { cn } from '../../../lib/utils';

/** Community detail: feed, compose, members, and owner/moderator controls. */
export default function CommunityDetailPage() {
  const { user, isLoading } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [draft, setDraft] = useState('');
  const [announce, setAnnounce] = useState(false);
  const [tab, setTab] = useState<'feed' | 'members'>('feed');

  const role = community?.myMembership?.status === 'active' ? community.myMembership.role : null;
  const isMod = role === 'owner' || role === 'moderator';
  const isMember = community?.myMembership?.status === 'active';

  const loadFeed = useCallback(() => {
    void communitiesApi
      .feed(id)
      .then((r) => setPosts(r.posts))
      .catch(() => setPosts([]));
  }, [id]);

  const refresh = useCallback(() => {
    void communitiesApi.detail(id).then(setCommunity);
    loadFeed();
    void communitiesApi
      .members(id)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [id, loadFeed]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (isLoading || !user) return null;
  if (!community) return null;

  const join = async () => {
    await communitiesApi.join(id);
    refresh();
  };
  const leave = async () => {
    await communitiesApi.leave(id);
    refresh();
  };
  const post = async () => {
    if (!draft.trim()) return;
    await communitiesApi.createPost(id, {
      postType: announce ? 'announcement' : 'text',
      body: draft.trim(),
      isAnonymous: false,
    });
    setDraft('');
    setAnnounce(false);
    loadFeed();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-space-5 px-space-4 py-space-8 md:px-space-8">
      <AppNav />
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => router.push('/communities')}
      >
        ← Communities
      </Button>

      <Card className="flex flex-col gap-space-2">
        <div className="flex items-center justify-between gap-space-3">
          <div className="flex flex-col gap-space-1">
            <span className="flex items-center gap-space-2">
              <CardTitle>{community.name}</CardTitle>
              {community.type === 'club' && (
                <span className="rounded-tooltip bg-surface px-space-2 py-0.5 text-small text-muted-foreground">
                  Club
                </span>
              )}
            </span>
            <CardDescription>
              {community.memberCount} member{community.memberCount === 1 ? '' : 's'} ·{' '}
              {community.visibility}
            </CardDescription>
          </div>
          {isMember ? (
            role !== 'owner' && (
              <Button variant="secondary" size="sm" onClick={() => void leave()}>
                Leave
              </Button>
            )
          ) : community.myMembership?.status === 'pending' ? (
            <span className="text-small text-muted-foreground">Requested</span>
          ) : community.visibility !== 'invite' ? (
            <Button size="sm" onClick={() => void join()}>
              {community.visibility === 'public' ? 'Join' : 'Request'}
            </Button>
          ) : (
            <span className="text-small text-muted-foreground">Invite only</span>
          )}
        </div>
        {community.description && (
          <p className="text-body text-muted-foreground">{community.description}</p>
        )}
      </Card>

      <div className="flex gap-space-2">
        {(['feed', 'members'] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t === 'feed' ? 'Feed' : 'Members'}
          </Button>
        ))}
      </div>

      {tab === 'feed' && (
        <div className="flex flex-col gap-space-3">
          {isMember && (
            <Card className="flex flex-col gap-space-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Post to this community…"
                maxLength={5000}
              />
              <div className="flex items-center gap-space-3">
                {isMod && (
                  <label className="flex cursor-pointer items-center gap-space-1 text-small text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={announce}
                      onChange={(e) => setAnnounce(e.target.checked)}
                    />
                    Announcement
                  </label>
                )}
                <Button
                  className="ml-auto"
                  size="sm"
                  disabled={!draft.trim()}
                  onClick={() => void post()}
                >
                  Post
                </Button>
              </div>
            </Card>
          )}

          {posts.length === 0 && (
            <p className="py-space-8 text-center text-caption text-muted-foreground">
              {isMember
                ? 'No posts yet. Start the conversation.'
                : 'Join to see and post in this community.'}
            </p>
          )}
          {posts.map((p) => (
            <CommunityPostCard
              key={p.id}
              post={p}
              selfId={user.id}
              canModerate={isMod}
              onChanged={loadFeed}
            />
          ))}
        </div>
      )}

      {tab === 'members' && (
        <div className="flex flex-col gap-space-2">
          {members.map((m) => (
            <Card key={m.userId} className="flex items-center justify-between gap-space-3">
              <div className="flex items-center gap-space-2">
                <span className="text-body text-foreground">{m.name}</span>
                <span className="rounded-tooltip bg-surface px-space-2 py-0.5 text-small text-muted-foreground">
                  {m.role}
                </span>
                {m.status === 'pending' && <span className="text-small text-warning">pending</span>}
              </div>
              {role === 'owner' && m.role !== 'owner' && (
                <div className="flex gap-space-1">
                  {m.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => void communitiesApi.approve(id, m.userId).then(refresh)}
                    >
                      Approve
                    </Button>
                  )}
                  {m.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void communitiesApi
                          .changeRole(id, m.userId, m.role === 'moderator' ? 'member' : 'moderator')
                          .then(refresh)
                      }
                    >
                      {m.role === 'moderator' ? 'Demote' : 'Make mod'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void communitiesApi.removeMember(id, m.userId).then(refresh)}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function CommunityPostCard({
  post,
  selfId,
  canModerate,
  onChanged,
}: {
  post: CommunityPost;
  selfId: string;
  canModerate: boolean;
  onChanged: () => void;
}) {
  const [count, setCount] = useState(post.reactionCount);
  const [mine, setMine] = useState(Boolean(post.myReaction));

  const toggle = async () => {
    if (mine) {
      const r = await communitiesApi.unreact(post.id);
      setCount(r.count);
      setMine(false);
    } else {
      const r = await communitiesApi.react(post.id, 'like');
      setCount(r.count);
      setMine(true);
    }
  };

  return (
    <Card className="flex flex-col gap-space-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-space-2 text-body font-medium text-foreground">
          {post.isAnonymous ? 'Anonymous' : (post.author?.name ?? 'Member')}
          {post.postType === 'announcement' && (
            <span className="rounded-tooltip bg-brand px-space-2 py-0.5 text-small text-brand-foreground">
              Announcement
            </span>
          )}
        </span>
        <time className="text-small text-muted-foreground">
          {new Date(post.createdAt).toLocaleDateString()}
        </time>
      </div>
      {post.body && <p className="whitespace-pre-wrap text-body text-foreground">{post.body}</p>}
      <div className="flex items-center gap-space-1 border-t border-border pt-space-2">
        <Button variant="ghost" size="sm" onClick={() => void toggle()} aria-label="Like">
          <Heart className={cn('h-4 w-4', mine && 'fill-brand text-brand')} />
          <span className="ml-space-1 text-small">{count}</span>
        </Button>
        {(canModerate || post.author?.id === selfId) && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            aria-label="Delete"
            onClick={() => void communitiesApi.deletePost(post.id).then(onChanged)}
          >
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        )}
      </div>
    </Card>
  );
}
