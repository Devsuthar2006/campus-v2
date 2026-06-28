'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PROFILE_VISIBILITIES,
  FRIEND_REQUEST_POLICIES,
  type PrivacySettings,
} from '@campusly/shared-types';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { profileApi } from '../../lib/profile';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { AppNav } from '../../components/AppNav';

/** Settings — privacy controls (UI_GUIDELINES.md §12; AUTH_SYSTEM.md §9). */
export default function SettingsPage() {
  const { user, isLoading } = useRequireAuth();
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
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
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
        </div>
      </div>
    </div>
  );
}
