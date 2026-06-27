'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GENDERS, type Gender } from '@campusly/shared-types';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { profileApi } from '../../lib/profile';
import { mediaApi } from '../../lib/media';
import { ApiClientError } from '../../lib/apiClient';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { MediaAttachment } from '../../components/MediaAttachment';
import { AppNav } from '../../components/AppNav';

/** Profile view/edit (implementation 02; UI_GUIDELINES.md §12). */
export default function ProfilePage() {
  const { user, isLoading } = useRequireAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: profileApi.getMyProfile,
    enabled: Boolean(user?.profileComplete),
  });

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [interests, setInterests] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    const p = profileQuery.data;
    if (p) {
      setName(p.name);
      setBio(p.bio ?? '');
      setGender(p.gender ?? '');
      setInterests(p.interests.map((i) => i.name).join(', '));
    }
  }, [profileQuery.data]);

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
      setMessage('Profile saved.');
      setError(null);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiClientError ? err.message : 'Could not save your profile.');
      setMessage(null);
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
      setMessage('Profile photo updated.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not update your photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-space-6 px-space-4 py-space-8 md:px-space-8">
      <AppNav />
      <div className="flex flex-col gap-space-1">
        <h1 className="text-h1 text-foreground">Your profile</h1>
        <p className="text-body text-muted-foreground">
          Verified details come from your campus; the rest is yours to edit.
        </p>
      </div>

      {profileQuery.isLoading && <p className="text-caption text-muted-foreground">Loading…</p>}

      {profileQuery.data && (
        <Card className="flex flex-col gap-space-5">
          <div className="flex flex-col gap-space-1">
            <CardTitle>Identity</CardTitle>
            <CardDescription>
              {profileQuery.data.email} · year {profileQuery.data.year ?? '—'} · verified student
            </CardDescription>
          </div>

          <div className="flex items-center gap-space-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-surface">
              {profileQuery.data.avatarMediaId ? (
                <MediaAttachment
                  attachment={{
                    mediaId: profileQuery.data.avatarMediaId,
                    kind: 'avatar',
                    mimeType: 'image/*',
                    durationMs: null,
                    expiresAt: null,
                  }}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-h3 text-muted-foreground">
                  {profileQuery.data.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-space-1">
              <span className="text-small font-medium text-foreground">Profile photo</span>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void onAvatar(e)}
                  disabled={avatarBusy}
                />
                <span className="inline-flex h-9 items-center rounded-button border border-border px-space-3 text-small text-foreground hover:bg-surface">
                  {avatarBusy ? 'Uploading…' : 'Change photo'}
                </span>
              </label>
            </div>
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

            {message && <p className="text-caption text-success">{message}</p>}
            {error && (
              <p className="text-caption text-danger" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </Card>
      )}
    </main>
  );
}
