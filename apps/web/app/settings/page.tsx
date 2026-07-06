'use client';

import { useEffect, useState } from 'react';
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
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { AppNav } from '../../components/AppNav';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LogOut } from 'lucide-react';

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
