'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { profileApi } from '../../lib/profile';
import { ApiClientError } from '../../lib/apiClient';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';

/**
 * Onboarding (implementation 02): first-run profile completion that transitions
 * the account from pending_verification to active. Guarded but allows the
 * incomplete state (this IS the completion step).
 */
export default function OnboardingPage() {
  const { user, isLoading } = useRequireAuth({ allowIncomplete: true });
  const { refresh } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already complete, the guard sends us home; render nothing meanwhile.
  if (isLoading || !user) return null;
  if (user.profileComplete) {
    router.replace('/');
    return null;
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const parsedYear = year.trim() ? Number(year) : undefined;
    profileApi
      .completeProfile({
        name: name.trim() || user.name,
        bio: bio.trim() || undefined,
        year: Number.isFinite(parsedYear) ? parsedYear : undefined,
        interests: interests
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      .then(async () => {
        await refresh();
        router.replace('/');
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiClientError ? err.message : 'Could not save your profile. Try again.',
        );
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-space-4 py-space-12">
      <Card className="flex flex-col gap-space-6">
        <div className="flex flex-col gap-space-1">
          <CardTitle>Complete your profile</CardTitle>
          <CardDescription>
            A few details so your campus knows who you are. You can change these later.
          </CardDescription>
        </div>

        <form className="flex flex-col gap-space-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-space-1">
            <span className="text-small font-medium text-foreground">Display name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={user.name}
              maxLength={80}
            />
          </label>

          <label className="flex flex-col gap-space-1">
            <span className="text-small font-medium text-foreground">Year of study</span>
            <Input
              type="number"
              min={1}
              max={10}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2"
            />
          </label>

          <label className="flex flex-col gap-space-1">
            <span className="text-small font-medium text-foreground">Bio</span>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              placeholder="Tell your campus a little about yourself."
            />
          </label>

          <label className="flex flex-col gap-space-1">
            <span className="text-small font-medium text-foreground">Interests</span>
            <Input
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="comma,separated,interests"
            />
          </label>

          {error && (
            <p className="text-caption text-danger" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Enter AnonymousU'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
