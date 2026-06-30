'use client';

import { useEffect, useState } from 'react';
import {
  REPORT_REASONS,
  FRIEND_SERVER_EVENTS,
  type ReportReason,
  type FriendRequestReceivedPayload,
} from '@campusly/shared-types';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useMatching } from '../../hooks/useMatching';
import { apiFetch, ApiClientError } from '../../lib/apiClient';
import { friendsApi } from '../../lib/friends';
import { getSocket } from '../../lib/socket';
import { AppNav } from '../../components/AppNav';
import { Chat } from '../../components/Chat';
import { Globe3D } from '../../components/Globe3D';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

type FriendState = 'idle' | 'sent' | 'incoming' | 'accepted';

export default function MatchPage() {
  const { user, isLoading } = useRequireAuth();
  const { state, sessionId, partner, findMatch, cancel, leaveSession } = useMatching();
  const [reporting, setReporting] = useState(false);
  const [friendState, setFriendState] = useState<FriendState>('idle');
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);

  // Reset friend UI whenever the session changes.
  useEffect(() => {
    setFriendState(partner ? 'accepted' : 'idle');
    setIncomingRequestId(null);
  }, [sessionId, partner]);

  // Listen for the partner's friend request / acceptance during the session.
  useEffect(() => {
    if (!sessionId) return;
    const socket = getSocket();
    const onReceived = (p: FriendRequestReceivedPayload) => {
      if (p.origin === 'session') {
        setIncomingRequestId(p.requestId);
        setFriendState((s) => (s === 'sent' || s === 'accepted' ? s : 'incoming'));
      }
    };
    const onAccepted = () => setFriendState('accepted');
    socket.on(FRIEND_SERVER_EVENTS.FRIEND_REQUEST_RECEIVED, onReceived);
    socket.on(FRIEND_SERVER_EVENTS.FRIEND_REQUEST_ACCEPTED, onAccepted);
    return () => {
      socket.off(FRIEND_SERVER_EVENTS.FRIEND_REQUEST_RECEIVED, onReceived);
      socket.off(FRIEND_SERVER_EVENTS.FRIEND_REQUEST_ACCEPTED, onAccepted);
    };
  }, [sessionId]);

  if (isLoading || !user) return null;

  const addFriend = () => {
    if (!sessionId) return;
    void friendsApi
      .sendRequest({ origin: 'session', sessionId })
      .then((res) => setFriendState(res.status === 'accepted' ? 'accepted' : 'sent'))
      .catch((err) => {
        if (err instanceof ApiClientError && err.code === 'conflict') {
          if (err.message.toLowerCase().includes('already friends')) {
            setFriendState('accepted');
          } else if (err.message.toLowerCase().includes('pending request')) {
            setFriendState('sent');
          } else {
            setFriendState('idle');
          }
        } else {
          setFriendState('idle');
        }
      });
  };

  const acceptFriend = () => {
    if (!incomingRequestId) return;
    void friendsApi
      .accept(incomingRequestId)
      .then(() => setFriendState('accepted'))
      .catch(() => setFriendState('incoming'));
  };

  const report = (reason: ReportReason) => {
    if (!sessionId) return;
    void apiFetch('/matching/report', {
      method: 'POST',
      body: JSON.stringify({ sessionId, reason }),
    }).finally(() => {
      setReporting(false);
      leaveSession();
    });
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <div className={cn('shrink-0', state === 'in_session' ? 'hidden md:block' : '')}>
        <AppNav />
      </div>

      <div
        className={cn(
          'flex-1 overflow-hidden flex flex-col pb-24 md:pb-8',
          state === 'in_session' ? 'px-0 md:px-space-8' : 'px-space-4 md:px-space-8',
        )}
      >
        <div
          className={cn(
            'mx-auto w-full flex-1 flex flex-col overflow-hidden',
            state === 'in_session' ? 'max-w-5xl py-0 md:py-space-5' : 'max-w-5xl py-space-5',
          )}
        >
          {state !== 'in_session' ? (
            /* ── Idle / Waiting: Globe + Button only ── */
            <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full select-none">
              {/* 3D Globe Canvas */}
              <div className="w-full aspect-square max-w-[420px] mb-space-6">
                <Globe3D isSearching={state === 'waiting'} className="h-full" />
              </div>

              {/* Action Button */}
              {state === 'idle' && (
                <Button
                  size="lg"
                  className="w-full sm:w-auto min-w-[220px] px-space-8 py-4 text-lg font-semibold rounded-full shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                  onClick={findMatch}
                >
                  Find a match
                </Button>
              )}

              {state === 'waiting' && (
                <div className="flex flex-col items-center gap-space-4">
                  <p className="text-caption text-muted-foreground animate-pulse tracking-wide">
                    Searching…
                  </p>
                  <Button
                    variant="secondary"
                    className="min-w-[180px] px-space-8 rounded-full active:scale-95 transition-all"
                    onClick={cancel}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* ── Connected Chat Screen ── */
            <div className="flex-1 flex flex-col overflow-hidden">
              <Card className="flex flex-col overflow-hidden flex-1 p-0 md:p-space-5 border-0 md:border md:border-border/60 rounded-none md:rounded-xl">
                {sessionId && (
                  <div className="flex w-full flex-col h-full overflow-hidden">
                    {/* Chat Header */}
                    <div className="flex flex-col gap-space-2 border-b border-divider px-space-4 py-space-3 md:px-0 shrink-0">
                      {/* Top row: status + leave/report */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-2 select-none min-w-0">
                          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-success animate-pulse" />
                          {partner ? (
                            <div className="flex items-center gap-space-2 min-w-0">
                              <Avatar
                                name={partner.name}
                                mediaId={partner.avatarMediaId}
                                size="sm"
                              />
                              <span className="text-body font-medium text-foreground truncate">
                                {partner.name}
                              </span>
                              <span className="text-small text-brand font-semibold shrink-0">
                                Friend
                              </span>
                            </div>
                          ) : (
                            <span className="text-body font-medium text-foreground">Anonymous</span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {friendState === 'incoming' ? (
                            <Button
                              size="sm"
                              onClick={acceptFriend}
                              className="text-xs px-2.5 py-1 h-auto"
                            >
                              Accept
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={addFriend}
                              disabled={friendState !== 'idle'}
                              className="text-xs px-2.5 py-1 h-auto"
                            >
                              {friendState === 'accepted'
                                ? '✓ Friends'
                                : friendState === 'sent'
                                  ? 'Sent ✓'
                                  : '+ Add'}
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={leaveSession}
                            className="text-xs px-2.5 py-1 h-auto"
                          >
                            Leave
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReporting((v) => !v)}
                            className="text-xs px-2.5 py-1 h-auto"
                          >
                            Report
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Report popup */}
                    {reporting && (
                      <div className="flex flex-wrap justify-center gap-space-2 py-space-3 border-b border-divider bg-surface/30 shrink-0 px-space-4 md:px-0">
                        {REPORT_REASONS.map((r) => (
                          <Button key={r} variant="danger" size="sm" onClick={() => report(r)}>
                            {r}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Active Chat box (scrolls internally) */}
                    <div className="flex-1 overflow-hidden min-h-0 mt-space-2 px-space-4 md:px-0">
                      <Chat contextType="anon_session" contextId={sessionId} selfId={user.id} />
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
