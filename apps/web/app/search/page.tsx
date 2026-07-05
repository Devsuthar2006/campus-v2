'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useFriends } from '../../hooks/useFriends';
import { AppNav } from '../../components/AppNav';
import { Avatar } from '../../components/Avatar';
import { profileApi } from '../../lib/profile';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Search as SearchIcon, UserPlus, UserCheck, Clock, UserX, Loader2 } from 'lucide-react';
import type { PublicProfile } from '@campusly/shared-types';

export default function SearchPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const { friends, incoming, outgoing, blocked, sendRequest, accept, cancel, unblock } =
    useFriends();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await profileApi.search(term);
      setResults(res);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void performSearch(query);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  if (authLoading || !user) return null;

  const handleAction = async (
    userId: string,
    actionType: 'send' | 'accept' | 'cancel' | 'unblock',
  ) => {
    setActionBusyId(userId);
    try {
      if (actionType === 'send') {
        await sendRequest(userId);
      } else if (actionType === 'accept') {
        const req = incoming.find((i) => i.fromUser?.id === userId);
        if (req) await accept(req.requestId);
      } else if (actionType === 'cancel') {
        const req = outgoing.find((o) => o.toUser?.id === userId);
        if (req) await cancel(req.requestId);
      } else if (actionType === 'unblock') {
        await unblock(userId);
      }
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <div className="shrink-0">
        <AppNav />
      </div>

      <div className="flex-1 overflow-y-auto">
        <main className="mx-auto max-w-xl px-space-4 py-space-8 pb-24 md:pb-8 flex flex-col gap-space-6 select-none">
          <div className="flex flex-col gap-space-2 text-center">
            <h1 className="text-h2 font-bold font-display text-foreground">Search Campus</h1>
            <p className="text-caption text-muted-foreground">
              Search by display name or unique @username to find and connect with friends.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              {searching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <SearchIcon className="h-5 w-5" />
              )}
            </span>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or @username..."
              className="pl-11 h-12 text-body bg-surface/50 border-border/80 rounded-full focus:border-brand focus:ring-brand shadow-sm"
              autoFocus
            />
          </div>

          {/* Results list */}
          <div className="flex flex-col gap-space-3 mt-space-2">
            {results.length > 0 ? (
              results.map((result) => {
                const targetId = result.userId;
                const isFriend = friends.some((f) => f.user.id === targetId);
                const isIncoming = incoming.some((i) => i.fromUser?.id === targetId);
                const isOutgoing = outgoing.some((o) => o.toUser?.id === targetId);
                const isBlocked = blocked.some((b) => b.user.id === targetId);
                const isBusy = actionBusyId === targetId;

                return (
                  <Card
                    key={targetId}
                    className="flex items-center justify-between p-space-4 hover:border-border transition-colors rounded-2xl bg-surface/30 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-space-3 min-w-0">
                      <Avatar name={result.name} mediaId={result.avatarMediaId} size="md" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-body font-medium text-foreground truncate">
                          {result.name}
                        </span>
                        {result.username && (
                          <span className="text-caption text-muted-foreground font-mono truncate">
                            @{result.username}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 ml-space-3">
                      {isBusy ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled
                          className="h-9 px-4 rounded-full"
                        >
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </Button>
                      ) : isFriend ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-small font-semibold">
                          <UserCheck className="h-4 w-4" />
                          <span>Friends</span>
                        </div>
                      ) : isBlocked ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAction(targetId, 'unblock')}
                          className="h-9 px-4 rounded-full border border-danger/20 hover:bg-danger/5 hover:text-danger text-small font-semibold transition-all"
                        >
                          <UserX className="h-4 w-4 mr-1.5" />
                          <span>Unblock</span>
                        </Button>
                      ) : isIncoming ? (
                        <Button
                          size="sm"
                          onClick={() => handleAction(targetId, 'accept')}
                          className="h-9 px-4 rounded-full bg-brand text-brand-foreground hover:scale-[1.02] text-small font-semibold transition-all shadow-sm"
                        >
                          <UserCheck className="h-4 w-4 mr-1.5" />
                          <span>Accept</span>
                        </Button>
                      ) : isOutgoing ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAction(targetId, 'cancel')}
                          className="h-9 px-4 rounded-full border border-border/80 hover:bg-muted text-muted-foreground text-small font-semibold transition-all"
                        >
                          <Clock className="h-4 w-4 mr-1.5" />
                          <span>Cancel</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAction(targetId, 'send')}
                          className="h-9 px-4 rounded-full border border-brand/20 hover:bg-brand/5 text-brand text-small font-semibold transition-all"
                        >
                          <UserPlus className="h-4 w-4 mr-1.5" />
                          <span>Add Friend</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
            ) : query.trim().length >= 2 && !searching ? (
              <div className="text-center p-space-8 text-muted-foreground">
                No students found matching &quot;{query}&quot;
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
