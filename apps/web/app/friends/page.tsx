'use client';

import { useState } from 'react';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useFriends } from '../../hooks/useFriends';
import { AppNav } from '../../components/AppNav';
import { Avatar } from '../../components/Avatar';
import { Chat } from '../../components/Chat';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

/**
 * Friend system surfaces (FRIEND_SYSTEM.md, UI_GUIDELINES.md §12): friends list
 * with persistent chat, incoming/outgoing requests, and blocked users. The chat
 * reuses the Phase 04 conversation component with revealed identities.
 * Desktop: split-pane (list + chat side-by-side). Mobile: list or chat full-screen.
 */
export default function FriendsPage() {
  const { user, isLoading } = useRequireAuth();
  const {
    friends,
    incoming,
    outgoing,
    blocked,
    accept,
    reject,
    cancel,
    removeFriend,
    block,
    unblock,
  } = useFriends();
  const [openFriendshipId, setOpenFriendshipId] = useState<string | null>(null);

  if (isLoading || !user) return null;

  const openFriend = friends.find((f) => f.friendshipId === openFriendshipId);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {/* AppNav — hidden on mobile when chat is open */}
      <div className={cn('shrink-0', openFriendshipId ? 'hidden md:block' : '')}>
        <AppNav />
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3">
        {/* Left: Friends List — hidden on mobile when chat is open */}
        <aside
          className={cn(
            'col-span-1 md:col-span-1 md:border-r border-divider flex flex-col overflow-y-auto px-space-4 py-space-5 md:px-space-6 pb-24 md:pb-space-5',
            openFriendshipId ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className="flex flex-col gap-space-6">
            <div className="flex flex-col gap-space-1">
              <h1 className="text-h1 text-foreground">Friends</h1>
              <p className="text-body text-muted-foreground">
                Connections you made on AnonymousU. Friend chats stay with you.
              </p>
            </div>

            {/* Incoming requests */}
            {incoming.length > 0 && (
              <section className="flex flex-col gap-space-3">
                <h2 className="text-h3 text-foreground">Requests</h2>
                {incoming.map((r) => (
                  <Card key={r.requestId} className="flex items-center justify-between gap-space-3">
                    <div className="flex items-center gap-space-3 min-w-0">
                      <Avatar
                        name={r.fromUser?.name ?? '?'}
                        mediaId={r.fromUser?.avatarMediaId ?? null}
                      />
                      <div className="flex flex-col gap-space-1 min-w-0">
                        <span className="text-body text-foreground truncate">
                          {r.fromUser ? r.fromUser.name : 'Someone from your chat'}
                        </span>
                        <span className="text-caption text-muted-foreground">
                          {r.origin === 'session'
                            ? 'From an anonymous chat'
                            : 'Wants to be friends'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-space-2 shrink-0">
                      <Button size="sm" onClick={() => void accept(r.requestId)}>
                        Accept
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void reject(r.requestId)}
                      >
                        Decline
                      </Button>
                    </div>
                  </Card>
                ))}
              </section>
            )}

            {/* Friends list */}
            <section className="flex flex-col gap-space-3">
              <h2 className="text-h3 text-foreground">Your friends</h2>
              {friends.length === 0 ? (
                <Card className="flex flex-col items-center gap-space-2 text-center">
                  <CardTitle>No friends yet</CardTitle>
                  <CardDescription>Start a match to meet someone new.</CardDescription>
                </Card>
              ) : (
                friends.map((f) => (
                  <Card
                    key={f.friendshipId}
                    className="flex items-center justify-between gap-space-3"
                  >
                    <div className="flex items-center gap-space-3 min-w-0">
                      <Avatar name={f.user.name} mediaId={f.user.avatarMediaId} />
                      <span className="text-body text-foreground truncate">{f.user.name}</span>
                    </div>
                    <div className="flex gap-space-2 shrink-0">
                      <Button size="sm" onClick={() => setOpenFriendshipId(f.friendshipId)}>
                        Message
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void removeFriend(f.friendshipId)}
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </section>

            {/* Outgoing requests */}
            {outgoing.length > 0 && (
              <section className="flex flex-col gap-space-3">
                <h2 className="text-h3 text-foreground">Sent requests</h2>
                {outgoing.map((r) => (
                  <Card key={r.requestId} className="flex items-center justify-between gap-space-3">
                    <span className="text-body text-muted-foreground truncate">
                      {r.toUser ? r.toUser.name : 'Pending (anonymous)'}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => void cancel(r.requestId)}>
                      Cancel
                    </Button>
                  </Card>
                ))}
              </section>
            )}

            {/* Blocked users */}
            {blocked.length > 0 && (
              <section className="flex flex-col gap-space-3">
                <h2 className="text-h3 text-foreground">Blocked</h2>
                {blocked.map((b) => (
                  <Card key={b.user.id} className="flex items-center justify-between gap-space-3">
                    <span className="text-body text-muted-foreground">{b.user.name}</span>
                    <Button variant="secondary" size="sm" onClick={() => void unblock(b.user.id)}>
                      Unblock
                    </Button>
                  </Card>
                ))}
              </section>
            )}
          </div>
        </aside>

        {/* Right: Chat Panel — visible on both mobile (when chat open) and desktop */}
        <section
          className={cn(
            'col-span-1 md:col-span-2 flex-col overflow-hidden',
            openFriendshipId ? 'flex' : 'hidden md:flex items-center justify-center',
          )}
        >
          {openFriend ? (
            <div className="flex flex-col h-full w-full">
              {/* Chat header */}
              <div className="flex items-center justify-between gap-space-3 border-b border-divider px-space-4 md:px-space-6 py-space-3 shrink-0">
                <div className="flex items-center gap-space-2">
                  {/* Back button — mobile only */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenFriendshipId(null)}
                    className="md:hidden p-1"
                  >
                    ←
                  </Button>
                  <Avatar
                    name={openFriend.user.name}
                    mediaId={openFriend.user.avatarMediaId}
                    size="sm"
                  />
                  <span className="text-body font-medium text-foreground">
                    {openFriend.user.name}
                  </span>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    void block(openFriend.user.id);
                    setOpenFriendshipId(null);
                  }}
                >
                  Block
                </Button>
              </div>
              {/* Chat body — fills remaining space, scrolls internally */}
              <div className="flex-1 overflow-hidden">
                <Chat
                  contextType="friendship"
                  contextId={openFriend.friendshipId}
                  selfId={user.id}
                />
              </div>
            </div>
          ) : (
            <div className="text-center p-space-8 text-muted-foreground flex flex-col items-center gap-space-2 select-none">
              <span className="text-h3 font-display">No conversation selected</span>
              <span className="text-caption">
                Select a friend from the list to start messaging.
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
