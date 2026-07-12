'use client';

import { useState, useEffect } from 'react';
import { REPORT_REASONS } from '@campusly/shared-types';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useFriends } from '../../hooks/useFriends';
import { AppNav } from '../../components/AppNav';
import { Avatar } from '../../components/Avatar';
import { Chat } from '../../components/Chat';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { profileApi } from '../../lib/profile';

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
    report,
  } = useFriends();
  const [openFriendshipId, setOpenFriendshipId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [publicProfile, setPublicProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [sidebarView, setSidebarView] = useState<'friends' | 'requests'>('friends');

  const openFriend = friends.find((f) => f.friendshipId === openFriendshipId);

  useEffect(() => {
    let active = true;
    if (showProfileView && openFriend) {
      setLoadingProfile(true);
      profileApi
        .getPublicProfile(openFriend.user.id)
        .then((profile) => {
          if (active) {
            setPublicProfile(profile);
          }
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => {
          if (active) {
            setLoadingProfile(false);
          }
        });
    } else {
      setPublicProfile(null);
    }
    return () => {
      active = false;
    };
  }, [showProfileView, openFriend]);

  if (isLoading || !user) return null;

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
            {sidebarView === 'friends' ? (
              <>
                <div className="flex flex-col gap-space-1">
                  <div className="flex items-center justify-between gap-space-2">
                    <h1 className="text-h1 text-foreground">Friends</h1>
                    <button
                      onClick={() => setSidebarView('requests')}
                      className="text-small text-brand hover:opacity-80 transition-opacity font-semibold flex items-center gap-1.5 select-none"
                    >
                      <span>Requests</span>
                      {(incoming.length > 0 || outgoing.length > 0) && (
                        <span className="bg-brand text-brand-foreground text-caption font-bold h-4 px-1 min-w-[16px] flex items-center justify-center rounded-full text-[10px]">
                          {incoming.length + outgoing.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Friends list */}
                <section className="flex flex-col mt-space-2">
                  <h2 className="text-caption font-semibold uppercase tracking-wider text-muted-foreground mb-space-3 px-space-2">
                    Your friends
                  </h2>
                  {friends.length === 0 ? (
                    <Card className="flex flex-col items-center gap-space-2 text-center py-space-6">
                      <CardTitle>No friends yet</CardTitle>
                      <CardDescription>Start a match to meet someone new.</CardDescription>
                    </Card>
                  ) : (
                    <div className="flex flex-col divide-y divide-border/30">
                      {friends.map((f) => {
                        const isSelected = openFriendshipId === f.friendshipId;
                        return (
                          <div
                            key={f.friendshipId}
                            onClick={() => setOpenFriendshipId(f.friendshipId)}
                            className={cn(
                              'flex items-center gap-space-4 py-space-3 px-space-3 cursor-pointer transition-all rounded-xl select-none border',
                              isSelected
                                ? 'bg-brand/10 border-brand/20 shadow-[0_2px_8px_rgba(255,153,0,0.06)]'
                                : 'hover:bg-muted/30 border-transparent',
                            )}
                          >
                            <Avatar name={f.user.name} mediaId={f.user.avatarMediaId} size="md" />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-body font-medium text-foreground truncate">
                                {f.user.name}
                                {f.user.username && (
                                  <span className="text-caption text-muted-foreground font-normal ml-1">
                                    @{f.user.username}
                                  </span>
                                )}
                              </span>
                              <span className="text-caption text-muted-foreground truncate">
                                Tap to chat
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Blocked users */}
                {blocked.length > 0 && (
                  <section className="flex flex-col gap-space-3 mt-space-4">
                    <h2 className="text-caption font-semibold uppercase tracking-wider text-muted-foreground px-space-2">
                      Blocked
                    </h2>
                    {blocked.map((b) => (
                      <Card
                        key={b.user.id}
                        className="flex items-center justify-between gap-space-3"
                      >
                        <span className="text-body text-muted-foreground">{b.user.name}</span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void unblock(b.user.id)}
                        >
                          Unblock
                        </Button>
                      </Card>
                    ))}
                  </section>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col gap-space-2">
                  <button
                    onClick={() => setSidebarView('friends')}
                    className="text-small text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold select-none self-start"
                  >
                    ← Back to friends
                  </button>
                  <h1 className="text-h2 font-bold text-foreground mt-space-2">Friend Requests</h1>
                </div>

                {/* Received requests list */}
                <section className="flex flex-col gap-space-3">
                  <h2 className="text-caption font-semibold uppercase tracking-wider text-muted-foreground px-space-2">
                    Received Requests ({incoming.length})
                  </h2>
                  {incoming.length === 0 ? (
                    <p className="text-small text-muted-foreground px-space-2 italic">
                      No incoming requests.
                    </p>
                  ) : (
                    incoming.map((r) => (
                      <Card
                        key={r.requestId}
                        className="flex items-center justify-between gap-space-3"
                      >
                        <div className="flex items-center gap-space-3 min-w-0">
                          <Avatar
                            name={r.fromUser?.name ?? '?'}
                            mediaId={r.fromUser?.avatarMediaId ?? null}
                          />
                          <div className="flex flex-col gap-space-1 min-w-0">
                            <span className="text-body text-foreground truncate">
                              {r.fromUser ? r.fromUser.name : 'Someone from your chat'}
                            </span>
                            <span className="text-caption text-muted-foreground truncate">
                              {r.origin === 'session'
                                ? 'From an anonymous chat'
                                : 'Wants to be friends'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-space-1.5 shrink-0">
                          <Button
                            size="sm"
                            className="px-3"
                            onClick={() => void accept(r.requestId)}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="px-3"
                            onClick={() => void reject(r.requestId)}
                          >
                            Decline
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </section>

                {/* Outgoing requests list */}
                <section className="flex flex-col gap-space-3 mt-space-4">
                  <h2 className="text-caption font-semibold uppercase tracking-wider text-muted-foreground px-space-2">
                    Sent Requests ({outgoing.length})
                  </h2>
                  {outgoing.length === 0 ? (
                    <p className="text-small text-muted-foreground px-space-2 italic">
                      No pending outgoing requests.
                    </p>
                  ) : (
                    outgoing.map((r) => (
                      <Card
                        key={r.requestId}
                        className="flex items-center justify-between gap-space-3"
                      >
                        <div className="flex items-center gap-space-3 min-w-0">
                          <Avatar
                            name={r.toUser?.name ?? '?'}
                            mediaId={r.toUser?.avatarMediaId ?? null}
                          />
                          <div className="flex flex-col gap-space-1 min-w-0">
                            <span className="text-body text-foreground truncate">
                              {r.toUser ? r.toUser.name : 'Pending (anonymous)'}
                            </span>
                            <span className="text-caption text-muted-foreground">
                              Awaiting response
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-muted"
                          onClick={() => void cancel(r.requestId)}
                        >
                          Cancel
                        </Button>
                      </Card>
                    ))
                  )}
                </section>
              </>
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
                <div className="flex items-center gap-space-2 flex-1 min-w-0">
                  {/* Back button — mobile only */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenFriendshipId(null)}
                    className="md:hidden p-1 shrink-0"
                  >
                    ←
                  </Button>
                  <div
                    onClick={() => setShowOptions(true)}
                    className="flex items-center gap-space-2 cursor-pointer hover:opacity-80 transition-opacity select-none min-w-0 flex-1"
                  >
                    <Avatar
                      name={openFriend.user.name}
                      mediaId={openFriend.user.avatarMediaId}
                      size="sm"
                    />
                    <span className="text-body font-medium text-foreground truncate">
                      {openFriend.user.name}
                      {openFriend.user.username && (
                        <span className="text-caption text-muted-foreground font-normal ml-1">
                          @{openFriend.user.username}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
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

      {/* Options modal overlay — Instagram style */}
      {showOptions && openFriend && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-space-4 animate-in fade-in duration-200">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => setShowOptions(false)} />

          <div className="relative bg-card border border-border w-full max-w-[280px] rounded-2xl shadow-2xl flex flex-col items-center overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-space-5 flex flex-col items-center gap-space-2">
              <Avatar
                name={openFriend.user.name}
                mediaId={openFriend.user.avatarMediaId}
                size="lg"
              />
              <span className="text-body font-semibold text-foreground mt-space-1">
                {openFriend.user.name}
                {openFriend.user.username && (
                  <span className="text-caption text-muted-foreground font-normal block">
                    @{openFriend.user.username}
                  </span>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowOptions(false);
                setShowProfileView(true);
              }}
              className="w-full py-space-3 text-body font-medium hover:bg-muted/50 transition-colors border-t border-divider text-foreground select-none"
            >
              View Profile
            </button>
            <button
              type="button"
              onClick={() => {
                void removeFriend(openFriend.friendshipId);
                setShowOptions(false);
                setOpenFriendshipId(null);
              }}
              className="w-full py-space-3 text-body font-medium hover:bg-muted/50 transition-colors border-t border-divider text-danger select-none"
            >
              Remove Friend
            </button>
            <button
              type="button"
              onClick={() => {
                void block(openFriend.user.id);
                setShowOptions(false);
                setOpenFriendshipId(null);
              }}
              className="w-full py-space-3 text-body font-medium hover:bg-danger/10 transition-colors border-t border-divider text-danger select-none"
            >
              Block User
            </button>
            <button
              type="button"
              onClick={() => {
                setShowOptions(false);
                setReporting(true);
              }}
              className="w-full py-space-3 text-body font-medium hover:bg-danger/10 transition-colors border-t border-divider text-danger select-none"
            >
              Report User
            </button>
            <button
              type="button"
              onClick={() => setShowOptions(false)}
              className="w-full py-space-3 text-body font-normal hover:bg-muted/50 transition-colors border-t border-divider text-muted-foreground select-none"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report Reasons Modal Overlay */}
      {reporting && openFriend && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-space-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setReporting(false)} />

          <div className="relative bg-card border border-border w-full max-w-[280px] rounded-2xl shadow-2xl flex flex-col p-space-4 gap-space-3 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-body font-semibold text-foreground">Report User</h3>
            <p className="text-caption text-muted-foreground">
              Please select a reason for reporting. This will block them and submit the chat
              transcript for review.
            </p>
            <div className="flex flex-col gap-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    void report(openFriend.friendshipId, reason);
                    setReporting(false);
                    setOpenFriendshipId(null);
                  }}
                  className="w-full py-2 px-3 text-left text-small font-medium hover:bg-muted transition-colors rounded-lg capitalize border border-border/40 text-foreground"
                >
                  {reason.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setReporting(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Profile Details Modal Overlay */}
      {showProfileView && openFriend && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-space-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowProfileView(false)} />

          <div className="relative bg-card border border-border w-full max-w-sm rounded-2xl shadow-2xl p-space-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            {loadingProfile ? (
              <div className="py-space-8 text-body text-muted-foreground flex flex-col items-center gap-space-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                <span>Loading profile...</span>
              </div>
            ) : publicProfile ? (
              <div className="flex flex-col items-center w-full">
                <Avatar name={publicProfile.name} mediaId={publicProfile.avatarMediaId} size="lg" />
                <h2 className="text-h2 font-semibold text-foreground mt-space-3">
                  {publicProfile.name}
                </h2>

                {publicProfile.gender && (
                  <span className="px-3 py-0.5 bg-muted text-caption rounded-full border border-border mt-space-2 text-muted-foreground">
                    {publicProfile.gender.charAt(0).toUpperCase() + publicProfile.gender.slice(1)}
                  </span>
                )}

                <p className="text-body text-muted-foreground italic mt-space-4 px-space-2 break-words max-w-full">
                  {publicProfile.bio ? `"${publicProfile.bio}"` : 'No bio yet.'}
                </p>

                {publicProfile.interests && publicProfile.interests.length > 0 && (
                  <div className="mt-space-5 w-full">
                    <h4 className="text-caption font-semibold uppercase tracking-wider text-muted-foreground mb-space-2">
                      Interests
                    </h4>
                    <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto">
                      {publicProfile.interests.map((interest: any) => (
                        <span
                          key={interest.name}
                          className="px-2.5 py-0.5 bg-brand/10 border border-brand/20 text-brand text-caption rounded-full"
                        >
                          #{interest.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-space-6 text-body text-danger/80">Could not load profile.</div>
            )}

            <button
              type="button"
              onClick={() => setShowProfileView(false)}
              className="mt-space-6 w-full py-space-2.5 bg-muted hover:bg-muted/80 text-body font-medium rounded-xl transition-colors border border-border text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
