'use client';

import { useEffect, useState, useRef, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PROFILE_VISIBILITIES,
  FRIEND_REQUEST_POLICIES,
  type PrivacySettings,
} from '@campusly/shared-types';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useAuth } from '../../components/AuthProvider';
import { profileApi } from '../../lib/profile';
import { authApi } from '../../lib/auth';
import { ApiClientError } from '../../lib/apiClient';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { AppNav } from '../../components/AppNav';
import { ThemeToggle } from '../../components/ThemeToggle';
import {
  LogOut,
  HelpCircle,
  Lock,
  Check,
  X,
  Eye,
  EyeOff,
  AtSign,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

/** Settings — privacy controls (UI_GUIDELINES.md §12; AUTH_SYSTEM.md §9). */
export default function SettingsPage() {
  const { user, isLoading } = useRequireAuth();
  const { logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: profileApi.getMyProfile,
    enabled: Boolean(user?.profileComplete),
  });

  const update = useMutation({
    mutationFn: (patch: Partial<PrivacySettings>) => profileApi.updatePrivacy(patch),
    onSuccess: (updated) => queryClient.setQueryData(['profile', 'me'], updated),
  });

  // Match settings / gender filter local state
  const [matchGenderPref, setMatchGenderPref] = useState<'all' | 'male' | 'female' | 'other'>(
    'all',
  );
  const [showFilterBeforeMatch, setShowFilterBeforeMatch] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const skip = localStorage.getItem('anonymousu:match:skip_gender_filter') === 'true';
      const storedPref =
        (localStorage.getItem('anonymousu:match:gender_preference') as any) || 'all';
      setMatchGenderPref(storedPref);
      setShowFilterBeforeMatch(!skip);
    }
  }, []);

  const handleGenderPrefChange = (val: 'all' | 'male' | 'female' | 'other') => {
    setMatchGenderPref(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('anonymousu:match:gender_preference', val);
    }
  };

  const handleShowFilterToggle = () => {
    const nextVal = !showFilterBeforeMatch;
    setShowFilterBeforeMatch(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('anonymousu:match:skip_gender_filter', nextVal ? 'false' : 'true');
    }
  };

  // ─── Security / Password State ─────────────────────────────────────────────
  const [secUsername, setSecUsername] = useState('');
  const [secUsernameStatus, setSecUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken'
  >('idle');
  const [secCurrentPw, setSecCurrentPw] = useState('');
  const [secNewPw, setSecNewPw] = useState('');
  const [secConfirmPw, setSecConfirmPw] = useState('');
  const [secShowPw, setSecShowPw] = useState(false);
  const [secPending, setSecPending] = useState(false);
  const [secError, setSecError] = useState<string | null>(null);
  const [secSuccess, setSecSuccess] = useState(false);
  const secDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Does the current user have a password set? We infer from the profile query.
  // The user object from AuthProvider has `username`; if username is null, they likely haven't set creds.
  const hasPassword = Boolean(user?.username); // proxy: if username exists, password was set

  const checkSecUsername = useCallback((value: string) => {
    if (secDebounceRef.current) clearTimeout(secDebounceRef.current);
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleaned.length < 3) {
      setSecUsernameStatus('idle');
      return;
    }
    setSecUsernameStatus('checking');
    secDebounceRef.current = setTimeout(async () => {
      try {
        const result = await authApi.checkUsername(cleaned);
        setSecUsernameStatus(result.available ? 'available' : 'taken');
      } catch {
        setSecUsernameStatus('idle');
      }
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (secDebounceRef.current) clearTimeout(secDebounceRef.current);
    };
  }, []);

  const secPasswordsMatch = secNewPw.length >= 8 && secNewPw === secConfirmPw;
  const secUsernameValid = /^[a-z0-9_]{3,30}$/.test(secUsername);
  const secCanSubmit = hasPassword
    ? secCurrentPw.length > 0 && secPasswordsMatch
    : (user?.username ? true : secUsernameValid && secUsernameStatus !== 'taken') &&
      secPasswordsMatch;

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!secCanSubmit) return;
    setSecError(null);
    setSecSuccess(false);
    setSecPending(true);
    profileApi
      .setPassword({
        ...(hasPassword ? { currentPassword: secCurrentPw } : {}),
        newPassword: secNewPw,
        ...(!hasPassword && !user?.username && secUsername
          ? { username: secUsername.toLowerCase() }
          : {}),
      })
      .then(() => {
        setSecSuccess(true);
        setSecCurrentPw('');
        setSecNewPw('');
        setSecConfirmPw('');
        setSecUsername('');
        setSecUsernameStatus('idle');
      })
      .catch((err: unknown) => {
        setSecError(
          err instanceof ApiClientError ? err.message : 'Failed to update password. Try again.',
        );
      })
      .finally(() => setSecPending(false));
  };

  if (isLoading || !user) return null;
  const privacy = profileQuery.data?.privacy;

  const Toggle = ({
    label,
    description,
    value,
    field,
  }: {
    label: string;
    description: string;
    value: boolean;
    field: keyof PrivacySettings;
  }) => (
    <div className="flex items-center justify-between gap-space-4">
      <div className="flex flex-col">
        <span className="text-body text-foreground">{label}</span>
        <span className="text-caption text-muted-foreground">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => update.mutate({ [field]: !value } as Partial<PrivacySettings>)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          value ? 'bg-brand' : 'bg-disabled'
        }`}
      >
        <span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background transition-transform duration-200"
          style={{
            transform: value ? 'translateX(20px)' : 'translateX(0px)',
          }}
        />
      </button>
    </div>
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <div className="shrink-0">
        <AppNav />
      </div>
      <div className="flex-1 overflow-y-auto px-space-4 md:px-space-8 pb-24 md:pb-8">
        <div className="mx-auto max-w-2xl flex flex-col gap-space-6 py-space-5">
          <div className="flex flex-col gap-space-1">
            <h1 className="text-h1 text-foreground">Settings</h1>
            <p className="text-body text-muted-foreground">
              You control what your campus sees. Defaults favor your privacy.
            </p>
          </div>

          {privacy && (
            <Card className="flex flex-col gap-space-5">
              <div className="flex flex-col gap-space-1">
                <CardTitle>Privacy</CardTitle>
                <CardDescription>Presence, receipts, and visibility.</CardDescription>
              </div>

              <Toggle
                label="Show online status"
                description="Let friends see when you're active."
                value={privacy.showOnlineStatus}
                field="showOnlineStatus"
              />
              <Toggle
                label="Show last seen"
                description="Display when you were last active."
                value={privacy.showLastSeen}
                field="showLastSeen"
              />
              <Toggle
                label="Send read receipts"
                description="Others see when you've read their messages (and you see theirs)."
                value={privacy.sendReadReceipts}
                field="sendReadReceipts"
              />

              <label className="flex flex-col gap-space-1">
                <span className="text-body text-foreground">Profile visibility</span>
                <select
                  value={privacy.profileVisibility}
                  onChange={(e) =>
                    update.mutate({
                      profileVisibility: e.target.value as PrivacySettings['profileVisibility'],
                    })
                  }
                  className="h-11 rounded-input border border-border bg-background px-space-3 text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {PROFILE_VISIBILITIES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-space-1">
                <span className="text-body text-foreground">Who can send friend requests</span>
                <select
                  value={privacy.allowFriendRequests}
                  onChange={(e) =>
                    update.mutate({
                      allowFriendRequests: e.target.value as PrivacySettings['allowFriendRequests'],
                    })
                  }
                  className="h-11 rounded-input border border-border bg-background px-space-3 text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {FRIEND_REQUEST_POLICIES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </Card>
          )}

          {/* Match Settings Card */}
          <Card className="flex flex-col gap-space-5">
            <div className="flex flex-col gap-space-1">
              <CardTitle>Match Settings</CardTitle>
              <CardDescription>Configure your anonymous matching preferences.</CardDescription>
            </div>

            {/* Toggle show settings before matching */}
            <div className="flex items-center justify-between gap-space-4">
              <div className="flex flex-col">
                <span className="text-body text-foreground">Show settings before matching</span>
                <span className="text-caption text-muted-foreground">
                  Prompt for gender filters every time you start searching for a match.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showFilterBeforeMatch}
                aria-label="Show settings before matching"
                onClick={handleShowFilterToggle}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  showFilterBeforeMatch ? 'bg-brand' : 'bg-disabled'
                }`}
              >
                <span
                  className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background transition-transform duration-200"
                  style={{
                    transform: showFilterBeforeMatch ? 'translateX(20px)' : 'translateX(0px)',
                  }}
                />
              </button>
            </div>

            {/* Gender Preference Select */}
            <label className="flex flex-col gap-space-1">
              <span className="text-body text-foreground">Default matching filter</span>
              <select
                value={matchGenderPref}
                onChange={(e) => handleGenderPrefChange(e.target.value as any)}
                className="h-11 rounded-input border border-border bg-background px-space-3 text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="all">Everyone</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
          </Card>

          {/* Security Card — Set / Change Password */}
          <Card className="flex flex-col gap-space-5">
            <div className="flex flex-col gap-space-1">
              <div className="flex items-center gap-space-2">
                <ShieldCheck className="h-5 w-5 text-brand" />
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>
                {hasPassword
                  ? 'Change your password to keep your account secure.'
                  : 'Set a username and password to sign in without Google.'}
              </CardDescription>
            </div>

            <form className="flex flex-col gap-space-3" onSubmit={handlePasswordSubmit}>
              {/* Username (only shown if user has no username yet) */}
              {!hasPassword && !user?.username && (
                <label className="flex flex-col gap-space-1">
                  <span className="text-body text-foreground">Username</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <AtSign className="h-4 w-4" />
                    </span>
                    <input
                      value={secUsername}
                      onChange={(e) => {
                        const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                        setSecUsername(v);
                        checkSecUsername(v);
                      }}
                      placeholder="your_username"
                      maxLength={30}
                      className="h-11 w-full rounded-input border border-border bg-background pl-9 pr-9 text-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {secUsernameStatus === 'checking' && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {secUsernameStatus === 'available' && (
                        <Check className="h-4 w-4 text-emerald-500" />
                      )}
                      {secUsernameStatus === 'taken' && <X className="h-4 w-4 text-danger" />}
                    </span>
                  </div>
                  <span
                    className={`text-caption ${secUsernameStatus === 'taken' ? 'text-danger' : 'text-muted-foreground'}`}
                  >
                    {secUsernameStatus === 'taken'
                      ? 'This username is taken.'
                      : secUsernameStatus === 'available'
                        ? 'Username is available!'
                        : 'Lowercase letters, numbers, and underscores. 3–30 characters.'}
                  </span>
                </label>
              )}

              {/* Current password (only shown if user already has a password) */}
              {hasPassword && (
                <label className="flex flex-col gap-space-1">
                  <span className="text-body text-foreground">Current password</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={secShowPw ? 'text' : 'password'}
                      value={secCurrentPw}
                      onChange={(e) => setSecCurrentPw(e.target.value)}
                      placeholder="Enter current password"
                      className="h-11 w-full rounded-input border border-border bg-background pl-9 pr-9 text-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </div>
                </label>
              )}

              {/* New password */}
              <label className="flex flex-col gap-space-1">
                <span className="text-body text-foreground">New password</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={secShowPw ? 'text' : 'password'}
                    value={secNewPw}
                    onChange={(e) => {
                      setSecNewPw(e.target.value);
                      setSecSuccess(false);
                    }}
                    placeholder="At least 8 characters"
                    maxLength={128}
                    className="h-11 w-full rounded-input border border-border bg-background pl-9 pr-9 text-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setSecShowPw(!secShowPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {secShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {/* Confirm new password */}
              <label className="flex flex-col gap-space-1">
                <span className="text-body text-foreground">Confirm new password</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={secShowPw ? 'text' : 'password'}
                    value={secConfirmPw}
                    onChange={(e) => {
                      setSecConfirmPw(e.target.value);
                      setSecSuccess(false);
                    }}
                    placeholder="Re-enter new password"
                    maxLength={128}
                    className="h-11 w-full rounded-input border border-border bg-background pl-9 pr-9 text-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                  {secConfirmPw.length > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {secPasswordsMatch ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <X className="h-4 w-4 text-danger" />
                      )}
                    </span>
                  )}
                </div>
                {secConfirmPw.length > 0 && !secPasswordsMatch && (
                  <span className="text-caption text-danger">Passwords do not match.</span>
                )}
              </label>

              {secError && (
                <p className="text-caption text-danger" role="alert">
                  {secError}
                </p>
              )}
              {secSuccess && (
                <p className="text-caption text-emerald-500">Password updated successfully!</p>
              )}

              <button
                type="submit"
                disabled={secPending || !secCanSubmit}
                className="h-10 rounded-button bg-brand px-space-6 text-body font-semibold text-brand-foreground transition-transform hover:scale-[1.02] disabled:opacity-60"
              >
                {secPending ? 'Saving…' : hasPassword ? 'Change Password' : 'Set Password'}
              </button>
            </form>
          </Card>

          {/* Appearance Card */}
          <Card className="flex flex-col gap-space-5">
            <div className="flex flex-col gap-space-1">
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel.</CardDescription>
            </div>
            <div className="flex items-center justify-between gap-space-4">
              <div className="flex flex-col">
                <span className="text-body text-foreground">Theme</span>
                <span className="text-caption text-muted-foreground">
                  Switch between light and dark mode.
                </span>
              </div>
              <ThemeToggle />
            </div>

            <div className="border-t border-divider pt-space-4 flex items-center justify-between gap-space-4">
              <div className="flex flex-col">
                <span className="text-body text-foreground">Interactive App Tour</span>
                <span className="text-caption text-muted-foreground">
                  Take the onboarding tour again to learn features.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('anonymousu:tour_completed');
                  window.location.reload();
                }}
                className="flex items-center gap-2 h-9 px-4 rounded-xl border border-border hover:bg-muted/40 transition-colors text-caption font-semibold text-foreground"
              >
                <HelpCircle className="h-4 w-4 text-brand" />
                <span>Replay Tour</span>
              </button>
            </div>
          </Card>

          {/* Account Card */}
          <Card className="flex flex-col gap-space-5">
            <div className="flex flex-col gap-space-1">
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account.</CardDescription>
            </div>
            <button
              type="button"
              onClick={() => void logout().then(() => router.replace('/?view=signin'))}
              className="flex items-center gap-space-2 text-danger hover:text-danger/80 transition-colors text-body font-medium py-space-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
