'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GENDERS, type Gender, type WallPost } from '@campusly/shared-types';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useFriends } from '../../hooks/useFriends';
import { profileApi } from '../../lib/profile';
import { mediaApi } from '../../lib/media';
import { wallApi } from '../../lib/wall';
import { ApiClientError } from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Avatar } from '../../components/Avatar';
import { PostCard } from '../../components/wall/PostCard';
import { AppNav } from '../../components/AppNav';
import { Grid3X3, Bookmark, Edit, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Premium Instagram-style Profile page.
 * Displays user avatar, statistics, bio, and a tabbed feed (Posts and Bookmarked).
 */
export default function ProfilePage() {
  const { user, isLoading } = useRequireAuth();
  const { friends } = useFriends();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: profileApi.getMyProfile,
    enabled: Boolean(user?.profileComplete),
  });

  // State hooks for profile editing
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [interests, setInterests] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // State hooks for tab navigation and feeds
  const [activeTab, setActiveTab] = useState<'posts' | 'bookmarks'>('posts');
  const [myPosts, setMyPosts] = useState<WallPost[]>([]);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [bookmarkedPosts, setBookmarkedPosts] = useState<WallPost[]>([]);
  const [bookmarksCursor, setBookmarksCursor] = useState<string | null>(null);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  useEffect(() => {
    const p = profileQuery.data;
    if (p) {
      setName(p.name);
      setBio(p.bio ?? '');
      setGender(p.gender ?? '');
      setInterests(p.interests.map((i) => i.name).join(', '));
    }
  }, [profileQuery.data]);

  // Load User's Own Posts
  const loadPosts = async (reset: boolean) => {
    if (!user) return;
    setLoadingPosts(true);
    try {
      const res = await wallApi.userPosts(user.id, reset ? undefined : (postsCursor ?? undefined));
      setMyPosts((prev) => (reset ? res.posts : [...prev, ...res.posts]));
      setPostsCursor(res.nextCursor);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Load User's Bookmarked Posts
  const loadBookmarks = async (reset: boolean) => {
    setLoadingBookmarks(true);
    try {
      const res = await wallApi.bookmarks(reset ? undefined : (bookmarksCursor ?? undefined));
      setBookmarkedPosts((prev) => (reset ? res.posts : [...prev, ...res.posts]));
      setBookmarksCursor(res.nextCursor);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    } finally {
      setLoadingBookmarks(false);
    }
  };

  // Fetch feeds when tab changes
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'posts') {
      void loadPosts(true);
    } else {
      void loadBookmarks(true);
    }
  }, [activeTab, user]);

  const save = useMutation({
    mutationFn: async () => {
      await profileApi.updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        gender: gender || undefined,
      });
      return profileApi.updateInterests(
        interests
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile', 'me'], updated);
      setError(null);
      setShowEditModal(false);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiClientError ? err.message : 'Could not save your profile.');
    },
  });

  if (isLoading || !user) return null;

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    setError(null);
    try {
      const media = await mediaApi.upload(file, 'avatar');
      const updated = await profileApi.updateProfile({ avatarMediaId: media.id });
      queryClient.setQueryData(['profile', 'me'], updated);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not update your photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <div className="shrink-0">
        <AppNav />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl md:max-w-4xl px-space-4 py-space-8 pb-24 md:pb-8 flex flex-col gap-space-8">
          {/* Instagram-Style Profile Header */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-space-6 md:gap-space-12 border-b border-divider pb-space-8 px-space-2 select-none">
            {/* Left side: Avatar */}
            <div className="shrink-0 relative group">
              <div className="h-24 w-24 md:h-32 md:w-32 overflow-hidden rounded-full border-2 border-brand/20 bg-surface shadow-md flex items-center justify-center">
                <Avatar
                  name={profileQuery.data?.name ?? user.name}
                  mediaId={profileQuery.data?.avatarMediaId ?? null}
                  size="lg"
                  className="h-full w-full object-cover"
                />
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-brand text-brand-foreground rounded-full shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void onAvatar(e)}
                  disabled={avatarBusy}
                />
                {avatarBusy ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-foreground border-t-transparent" />
                ) : (
                  <Edit className="h-4 w-4" />
                )}
              </label>
            </div>

            {/* Right side: Info */}
            <div className="flex-1 flex flex-col items-center md:items-start gap-space-4">
              <div className="flex flex-col md:flex-row items-center gap-space-4">
                <div className="flex flex-col items-center md:items-start">
                  <h2 className="text-h2 font-bold font-display text-foreground">
                    {profileQuery.data?.name ?? user.name}
                  </h2>
                  {user.username && (
                    <span className="text-caption text-muted-foreground font-mono">
                      @{user.username}
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setShowEditModal(true);
                  }}
                  className="rounded-full font-semibold px-4 h-9 shadow-sm"
                >
                  Edit Profile
                </Button>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-space-6 text-body">
                <div>
                  <span className="font-bold text-foreground">{myPosts.length}</span>{' '}
                  <span className="text-muted-foreground">posts</span>
                </div>
                <div>
                  <span className="font-bold text-foreground">{friends.length}</span>{' '}
                  <span className="text-muted-foreground">friends</span>
                </div>
              </div>

              {/* Bio / Meta Info */}
              <div className="flex flex-col gap-space-2 text-center md:text-left max-w-md">
                <div className="text-small text-muted-foreground">
                  {profileQuery.data?.email} · year {profileQuery.data?.year ?? '—'} · Student
                </div>
                {profileQuery.data?.bio && (
                  <p className="text-body text-foreground break-words whitespace-pre-wrap leading-relaxed mt-1">
                    {profileQuery.data.bio}
                  </p>
                )}
                {profileQuery.data?.gender && (
                  <div className="text-small text-muted-foreground mt-1">
                    Gender:{' '}
                    <span className="font-medium text-foreground capitalize">
                      {profileQuery.data.gender}
                    </span>
                  </div>
                )}
                {profileQuery.data?.interests && profileQuery.data.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center md:justify-start mt-2">
                    {profileQuery.data.interests.map((interest: any) => (
                      <span
                        key={interest.name}
                        className="px-2.5 py-0.5 bg-brand/10 border border-brand/20 text-brand text-caption rounded-full"
                      >
                        #{interest.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instagram-Style Feed Tabs */}
          <div className="flex justify-center border-b border-divider select-none">
            <button
              onClick={() => setActiveTab('posts')}
              className={cn(
                'flex items-center gap-space-2 py-space-3 px-space-6 text-caption font-semibold transition-all border-b-2 -mb-[1px]',
                activeTab === 'posts'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Grid3X3 className="h-4 w-4" />
              <span>Posts</span>
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={cn(
                'flex items-center gap-space-2 py-space-3 px-space-6 text-caption font-semibold transition-all border-b-2 -mb-[1px]',
                activeTab === 'bookmarks'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Bookmark className="h-4 w-4" />
              <span>Saved</span>
            </button>
          </div>

          {/* Feed Content */}
          <div className="flex flex-col gap-space-4">
            {activeTab === 'posts' ? (
              <>
                {myPosts.length === 0 && !loadingPosts ? (
                  <p className="py-space-12 text-center text-caption text-muted-foreground italic">
                    No posts published yet.
                  </p>
                ) : (
                  myPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      selfId={user.id}
                      onDeleted={(id) => setMyPosts((prev) => prev.filter((p) => p.id !== id))}
                    />
                  ))
                )}
                {loadingPosts && (
                  <p className="text-center text-caption text-muted-foreground py-space-4">
                    Loading posts…
                  </p>
                )}
                {postsCursor && !loadingPosts && (
                  <Button
                    variant="secondary"
                    onClick={() => void loadPosts(false)}
                    className="w-full mt-space-2 rounded-full py-2.5"
                  >
                    Load more posts
                  </Button>
                )}
              </>
            ) : (
              <>
                {bookmarkedPosts.length === 0 && !loadingBookmarks ? (
                  <p className="py-space-12 text-center text-caption text-muted-foreground italic">
                    No saved posts yet.
                  </p>
                ) : (
                  bookmarkedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      selfId={user.id}
                      onDeleted={(id) =>
                        setBookmarkedPosts((prev) => prev.filter((p) => p.id !== id))
                      }
                    />
                  ))
                )}
                {loadingBookmarks && (
                  <p className="text-center text-caption text-muted-foreground py-space-4">
                    Loading saved…
                  </p>
                )}
                {bookmarksCursor && !loadingBookmarks && (
                  <Button
                    variant="secondary"
                    onClick={() => void loadBookmarks(false)}
                    className="w-full mt-space-2 rounded-full py-2.5"
                  >
                    Load more saved
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal Overlay */}
      {showEditModal && profileQuery.data && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-space-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowEditModal(false)} />

          <div className="relative bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-space-6 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-divider pb-space-3 mb-space-4 select-none">
              <h3 className="text-body font-semibold text-foreground">Edit Profile</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors rounded-full"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="flex flex-col gap-space-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <label className="flex flex-col gap-space-1">
                <span className="text-small font-medium text-foreground">Display name</span>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </label>

              <label className="flex flex-col gap-space-1">
                <span className="text-small font-medium text-foreground">Bio</span>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} />
              </label>

              <label className="flex flex-col gap-space-1">
                <span className="text-small font-medium text-foreground">Gender</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender | '')}
                  className="h-11 rounded-input border border-border bg-background px-space-3 text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="">Prefer not to say</option>
                  {GENDERS.filter((g) => g !== 'prefer_not').map((g) => (
                    <option key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-space-1">
                <span className="text-small font-medium text-foreground">Interests</span>
                <Input
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="comma,separated,interests"
                />
              </label>

              {error && (
                <p className="text-caption text-danger" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={save.isPending}
                className="mt-space-2 rounded-xl py-2.5"
              >
                {save.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
