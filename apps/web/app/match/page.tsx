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
import { profileApi } from '../../lib/profile';
import { getSocket } from '../../lib/socket';
import { AppNav } from '../../components/AppNav';
import { Chat } from '../../components/Chat';
import { Globe3D } from '../../components/Globe3D';
import { SearchingGraphics } from '../../components/SearchingGraphics';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/ui/Button';
import { MoreHorizontal, Sparkles, Users, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

const MarsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 3h5v5" />
    <path d="M21 3l-7.5 7.5" />
    <circle cx="10" cy="14" r="5" />
  </svg>
);

const VenusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="8" r="5" />
    <path d="M12 13v8" />
    <path d="M9 17h6" />
  </svg>
);

type FriendState = 'idle' | 'sent' | 'incoming' | 'accepted';

export default function MatchPage() {
  const { user, isLoading } = useRequireAuth();
  const { state, sessionId, partner, findMatch, cancel, leaveSession } = useMatching();
  const [reporting, setReporting] = useState(false);
  const [friendState, setFriendState] = useState<FriendState>('idle');
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [publicProfile, setPublicProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Match settings / gender filter modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | 'other' | 'all'>('all');
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const onFindMatchClick = () => {
    if (typeof window === 'undefined') return;
    const skip = localStorage.getItem('anonymousu:match:skip_gender_filter') === 'true';
    const storedPref = (localStorage.getItem('anonymousu:match:gender_preference') as any) || 'all';

    if (skip) {
      findMatch(storedPref);
    } else {
      setGenderFilter(storedPref);
      setDontShowAgain(false);
      setShowSettingsModal(true);
    }
  };

  const handleStartSearch = () => {
    if (typeof window === 'undefined') return;
    if (dontShowAgain) {
      localStorage.setItem('anonymousu:match:skip_gender_filter', 'true');
      localStorage.setItem('anonymousu:match:gender_preference', genderFilter);
    } else {
      localStorage.setItem('anonymousu:match:skip_gender_filter', 'false');
      localStorage.setItem('anonymousu:match:gender_preference', genderFilter);
    }
    setShowSettingsModal(false);
    findMatch(genderFilter);
  };

  const handleNextMatch = () => {
    leaveSession();
    if (typeof window === 'undefined') return;
    const skipModal = localStorage.getItem('anonymousu:match:skip_gender_filter') === 'true';
    const storedPref = (localStorage.getItem('anonymousu:match:gender_preference') as any) || 'all';
    if (skipModal) {
      // User checked "don't show again" — auto-search immediately
      findMatch(storedPref);
    } else {
      // Show gender preference modal before re-matching
      setGenderFilter(storedPref);
      setDontShowAgain(false);
      setShowSettingsModal(true);
    }
  };

  useEffect(() => {
    let active = true;
    if (showProfileView && partner) {
      setLoadingProfile(true);
      profileApi
        .getPublicProfile(partner.id)
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
  }, [showProfileView, partner]);

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
          'flex-1 flex flex-col',
          state === 'in_session'
            ? 'overflow-hidden px-0 pb-0'
            : 'overflow-y-auto px-space-4 pb-24 md:px-space-8 md:pb-8',
        )}
      >
        <div
          className={cn(
            'w-full flex-1 flex flex-col',
            state === 'in_session'
              ? 'max-w-none py-0 overflow-hidden'
              : 'mx-auto max-w-5xl py-space-5',
          )}
        >
          {state !== 'in_session' ? (
            /* ── Idle / Waiting: Globe + Button only ── */
            <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full select-none gap-4">
              {/* Searching Graphics (rendered above the globe) */}
              {state === 'waiting' && (
                <div className="w-full max-w-[380px] animate-in fade-in slide-in-from-top-4 duration-500">
                  <SearchingGraphics />
                </div>
              )}

              {/* 3D Globe Canvas & Radar Rings (shrinks with animation when searching) */}
              <div
                className={cn(
                  'relative w-full aspect-square transition-all duration-500 ease-in-out mx-auto',
                  state === 'waiting'
                    ? 'max-w-[240px] md:max-w-[340px] scale-[0.78] -mt-2 mb-2'
                    : 'max-w-[320px] md:max-w-[420px] scale-100 mb-6',
                )}
              >
                <Globe3D isSearching={state === 'waiting'} className="h-full w-full" />
              </div>

              {/* Action Button */}
              {state === 'idle' && (
                <Button
                  size="lg"
                  className="w-full sm:w-auto min-w-[220px] px-space-8 py-4 text-lg font-semibold rounded-full shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                  onClick={onFindMatchClick}
                >
                  Find a match
                </Button>
              )}

              {state === 'waiting' && (
                <div className="flex flex-col items-center gap-space-4">
                  <Button
                    variant="secondary"
                    className="min-w-[180px] px-space-8 rounded-full active:scale-95 transition-all shadow-sm"
                    onClick={cancel}
                  >
                    Cancel Search
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* ── Connected Chat Screen ── */
            <div className="flex-1 flex flex-col overflow-hidden w-full h-full">
              {sessionId && (
                <div className="flex w-full flex-col h-full overflow-hidden">
                  {/* Chat Header */}
                  <div className="flex flex-col border-b border-divider px-space-4 md:px-space-6 py-space-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-2 select-none min-w-0 flex-1">
                        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-success animate-pulse" />
                        {partner ? (
                          <div
                            onClick={() => setShowOptions(true)}
                            className="flex items-center gap-space-2 cursor-pointer hover:opacity-80 transition-opacity select-none min-w-0 flex-1"
                          >
                            <Avatar name={partner.name} mediaId={partner.avatarMediaId} size="sm" />
                            <span className="text-body font-medium text-foreground truncate">
                              {partner.name}
                            </span>
                            {friendState === 'accepted' && (
                              <span className="text-small text-brand font-semibold shrink-0">
                                Friend
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => setShowOptions(true)}
                            className="flex items-center gap-space-2 cursor-pointer hover:opacity-80 transition-opacity select-none min-w-0 flex-1"
                          >
                            <Avatar name="?" mediaId={null} size="sm" />
                            <span className="text-body font-medium text-foreground truncate">
                              Anonymous Student
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowOptions(true)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors rounded-full flex items-center justify-center select-none"
                        aria-label="Options"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Active Chat box (scrolls internally) */}
                  <div className="flex-1 overflow-hidden min-h-0 mt-space-2 px-0">
                    <Chat
                      contextType="anon_session"
                      contextId={sessionId}
                      selfId={user.id}
                      onNextMatch={handleNextMatch}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Options modal overlay — Instagram style */}
      {showOptions && sessionId && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-space-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowOptions(false)} />

          <div className="relative bg-card border border-border w-full max-w-[280px] rounded-2xl shadow-2xl flex flex-col items-center overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-space-5 flex flex-col items-center gap-space-2">
              <Avatar
                name={partner ? partner.name : '?'}
                mediaId={partner ? partner.avatarMediaId : null}
                size="lg"
              />
              <span className="text-body font-semibold text-foreground mt-space-1">
                {partner ? partner.name : 'Anonymous Student'}
              </span>
            </div>

            {partner && (
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
            )}

            {partner &&
              (friendState === 'incoming' ? (
                <button
                  type="button"
                  onClick={() => {
                    acceptFriend();
                    setShowOptions(false);
                  }}
                  className="w-full py-space-3 text-body font-medium hover:bg-muted/50 transition-colors border-t border-divider text-brand select-none"
                >
                  Accept Friend Request
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (friendState === 'idle') {
                      addFriend();
                      setShowOptions(false);
                    }
                  }}
                  disabled={friendState !== 'idle'}
                  className={cn(
                    'w-full py-space-3 text-body font-medium hover:bg-muted/50 transition-colors border-t border-divider select-none',
                    friendState === 'idle'
                      ? 'text-brand'
                      : 'text-muted-foreground cursor-not-allowed',
                  )}
                >
                  {friendState === 'accepted'
                    ? '✓ Already Friends'
                    : friendState === 'sent'
                      ? 'Friend Request Sent ✓'
                      : 'Add Friend'}
                </button>
              ))}

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
              onClick={() => {
                leaveSession();
                setShowOptions(false);
              }}
              className="w-full py-space-3 text-body font-medium hover:bg-danger/10 transition-colors border-t border-divider text-danger select-none"
            >
              Leave Chat
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
      {reporting && partner && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-space-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setReporting(false)} />

          <div className="relative bg-card border border-border w-full max-w-[280px] rounded-2xl shadow-2xl flex flex-col items-center overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-space-5 text-center">
              <h3 className="text-body font-semibold text-foreground">Report User</h3>
              <p className="text-caption text-muted-foreground mt-1">
                Please select a reason for reporting
              </p>
            </div>

            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => report(reason)}
                className="w-full py-space-3 text-body font-medium hover:bg-danger/10 transition-colors border-t border-divider text-danger select-none"
              >
                {reason}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setReporting(false)}
              className="w-full py-space-3 text-body font-normal hover:bg-muted/50 transition-colors border-t border-divider text-muted-foreground select-none"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Profile Details Modal Overlay */}
      {showProfileView && partner && (
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

      {/* Match Settings / Gender Filter Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-space-4 animate-in fade-in duration-200">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => setShowSettingsModal(false)} />

          <div className="relative bg-card border border-border w-full max-w-sm rounded-3xl shadow-2xl p-space-6 flex flex-col gap-space-5 select-none animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-1 text-center">
              <h3 className="text-h3 font-bold text-foreground">Match Settings</h3>
              <p className="text-caption text-muted-foreground">
                Who would you like to connect with?
              </p>
            </div>

            {/* Gender Selection Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'all', label: 'Everyone', Icon: Users },
                { value: 'male', label: 'Male', Icon: MarsIcon },
                { value: 'female', label: 'Female', Icon: VenusIcon },
                { value: 'other', label: 'Other', Icon: Sparkles },
              ].map((opt) => {
                const isSelected = genderFilter === opt.value;
                const OptIcon = opt.Icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGenderFilter(opt.value as any)}
                    className={cn(
                      'relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                      isSelected
                        ? 'border-brand bg-brand/10 text-brand shadow-[0_2px_12px_rgba(255,153,0,0.08)]'
                        : 'border-border/60 bg-surface/30 text-muted-foreground hover:text-foreground hover:bg-surface/50 hover:border-border',
                    )}
                  >
                    <OptIcon
                      className={cn('h-6 w-6', isSelected ? 'text-brand' : 'text-muted-foreground')}
                    />
                    <span className="text-small font-medium">{opt.label}</span>
                    {isSelected && (
                      <span className="absolute top-2 right-2 bg-brand text-brand-foreground rounded-full p-0.5">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Don't show again checkbox */}
            <label className="flex items-center gap-3 px-1 py-1 cursor-pointer group">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="sr-only"
              />
              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all duration-200',
                  dontShowAgain
                    ? 'border-brand bg-brand text-brand-foreground'
                    : 'border-border/80 bg-surface/50 group-hover:border-border',
                )}
              >
                {dontShowAgain && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
              <span className="text-small text-muted-foreground group-hover:text-foreground transition-colors">
                Don&apos;t show this again
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 rounded-xl h-11"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleStartSearch}
                className="flex-1 bg-brand text-brand-foreground rounded-xl h-11 font-semibold"
              >
                Find match
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
