'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Community, CommunityInvite } from '@campusly/shared-types';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { communitiesApi } from '../../lib/communities';
import { ApiClientError } from '../../lib/apiClient';
import { AppNav } from '../../components/AppNav';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';

/** Community discovery + create + incoming invites (PUBLIC_WALL.md patterns). */
export default function CommunitiesPage() {
  const { user, isLoading } = useRequireAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [invites, setInvites] = useState<CommunityInvite[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'community' | 'club'>('community');
  const [visibility, setVisibility] = useState<'public' | 'request' | 'invite'>('public');
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    void communitiesApi.browse().then((r) => setCommunities(r.communities));
    void communitiesApi.invites().then(setInvites);
  };

  useEffect(() => {
    refresh();
  }, []);

  if (isLoading || !user) return null;

  const create = async () => {
    setError(null);
    try {
      await communitiesApi.create({
        name,
        slug,
        description: description || undefined,
        type,
        visibility,
      });
      setCreating(false);
      setName('');
      setSlug('');
      setDescription('');
      refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not create community.');
    }
  };

  const join = async (id: string) => {
    await communitiesApi.join(id);
    refresh();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-space-5 px-space-4 py-space-8 md:px-space-8">
      <AppNav />
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-space-1">
          <h1 className="text-h1 text-foreground">Communities</h1>
          <p className="text-body text-muted-foreground">Find your people. Start a club.</p>
        </div>
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : 'Create'}
        </Button>
      </div>

      {creating && (
        <Card className="flex flex-col gap-space-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            maxLength={80}
          />
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="url-slug"
            maxLength={60}
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this community about?"
            maxLength={500}
          />
          <div className="flex flex-wrap gap-space-3">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'community' | 'club')}
              className="h-9 rounded-input border border-border bg-background px-space-2 text-small text-foreground"
            >
              <option value="community">Community</option>
              <option value="club">Club</option>
            </select>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'request' | 'invite')}
              className="h-9 rounded-input border border-border bg-background px-space-2 text-small text-foreground"
            >
              <option value="public">Public</option>
              <option value="request">Request to join</option>
              <option value="invite">Invite only</option>
            </select>
            <Button
              className="ml-auto"
              size="sm"
              onClick={() => void create()}
              disabled={!name || !slug}
            >
              Create
            </Button>
          </div>
          {error && <p className="text-small text-danger">{error}</p>}
        </Card>
      )}

      {invites.length > 0 && (
        <section className="flex flex-col gap-space-2">
          <h2 className="text-h3 text-foreground">Invitations</h2>
          {invites.map((inv) => (
            <Card key={inv.id} className="flex items-center justify-between gap-space-3">
              <span className="text-body text-foreground">{inv.community.name}</span>
              <div className="flex gap-space-2">
                <Button
                  size="sm"
                  onClick={() => void communitiesApi.respondInvite(inv.id, true).then(refresh)}
                >
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void communitiesApi.respondInvite(inv.id, false).then(refresh)}
                >
                  Decline
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}

      <div className="flex flex-col gap-space-3">
        {communities.length === 0 && (
          <p className="py-space-8 text-center text-caption text-muted-foreground">
            No communities yet. Create the first one.
          </p>
        )}
        {communities.map((c) => (
          <Card key={c.id} className="flex items-center justify-between gap-space-3">
            <Link href={`/communities/${c.id}`} className="flex flex-1 flex-col gap-space-1">
              <span className="flex items-center gap-space-2">
                <CardTitle>{c.name}</CardTitle>
                {c.type === 'club' && (
                  <span className="rounded-tooltip bg-surface px-space-2 py-0.5 text-small text-muted-foreground">
                    Club
                  </span>
                )}
              </span>
              <CardDescription>
                {c.memberCount} member{c.memberCount === 1 ? '' : 's'} · {c.visibility}
              </CardDescription>
            </Link>
            {c.myMembership?.status === 'active' ? (
              <span className="text-small text-muted-foreground">Joined</span>
            ) : c.myMembership?.status === 'pending' ? (
              <span className="text-small text-muted-foreground">Requested</span>
            ) : c.visibility !== 'invite' ? (
              <Button size="sm" onClick={() => void join(c.id)}>
                {c.visibility === 'public' ? 'Join' : 'Request'}
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
    </main>
  );
}
