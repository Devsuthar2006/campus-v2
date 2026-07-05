'use client';

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2, AtSign, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { profileApi } from '../../lib/profile';
import { authApi } from '../../lib/auth';
import { ApiClientError } from '../../lib/apiClient';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { cn } from '../../lib/utils';

/**
 * Onboarding (implementation 02): first-run profile completion that transitions
 * the account from pending_verification to active. Now includes username and
 * password setup for the new auth system.
 */
export default function OnboardingPage() {
  const { user, isLoading } = useRequireAuth({ allowIncomplete: true });
  const { refresh } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  // New: credentials
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>(
    'idle',
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced username availability check
  const checkUsername = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleaned.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await authApi.checkUsername(cleaned);
        setUsernameStatus(result.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // If already complete, the guard sends us home; render nothing meanwhile.
  if (isLoading || !user) return null;
  if (user.profileComplete) {
    router.replace('/');
    return null;
  }

  const passwordsMatch = password.length >= 8 && password === confirmPassword;
  const usernameValid = /^[a-z0-9_]{3,30}$/.test(username);
  const canSubmit = usernameValid && passwordsMatch && usernameStatus !== 'taken';

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
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
        username: username.toLowerCase(),
        password,
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
            Set up your identity on AnonymousU. Your username is private until you become friends.
          </CardDescription>
        </div>

        <form className="flex flex-col gap-space-4" onSubmit={onSubmit}>
          {/* Username */}
          <label className="flex flex-col gap-space-1">
            <span className="text-small font-medium text-foreground">Username</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <AtSign className="h-4 w-4" />
              </span>
              <Input
                value={username}
                onChange={(e) => {
                  const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setUsername(v);
                  checkUsername(v);
                }}
                placeholder="your_username"
                maxLength={30}
                className="pl-9 pr-9"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {usernameStatus === 'available' && <Check className="h-4 w-4 text-emerald-500" />}
                {usernameStatus === 'taken' && <X className="h-4 w-4 text-danger" />}
              </span>
            </div>
            <span
              className={cn(
                'text-caption',
                usernameStatus === 'taken' ? 'text-danger' : 'text-muted-foreground',
              )}
            >
              {usernameStatus === 'taken'
                ? 'This username is taken.'
                : usernameStatus === 'available'
                  ? 'Username is available!'
                  : 'Lowercase letters, numbers, and underscores. 3–30 characters.'}
            </span>
          </label>

          {/* Password */}
          <label className="flex flex-col gap-space-1">
            <span className="text-small font-medium text-foreground">Password</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                maxLength={128}
                className="pl-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {/* Confirm Password */}
          <label className="flex flex-col gap-space-1">
            <span className="text-small font-medium text-foreground">Confirm password</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                maxLength={128}
                className="pl-9 pr-9"
              />
              {confirmPassword.length > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {passwordsMatch ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <X className="h-4 w-4 text-danger" />
                  )}
                </span>
              )}
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <span className="text-caption text-danger">Passwords do not match.</span>
            )}
          </label>

          <hr className="border-border/50" />

          {/* Display name */}
          <label className="flex flex-col gap-space-1">
            <span className="text-small font-medium text-foreground">Display name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={user.name}
              maxLength={80}
            />
          </label>

          {/* Year */}
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

          {/* Bio */}
          <label className="flex flex-col gap-space-1">
            <span className="text-small font-medium text-foreground">Bio</span>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              placeholder="Tell your campus a little about yourself."
            />
          </label>

          {/* Interests */}
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

          <Button type="submit" disabled={submitting || !canSubmit}>
            {submitting ? 'Saving…' : 'Enter AnonymousU'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
