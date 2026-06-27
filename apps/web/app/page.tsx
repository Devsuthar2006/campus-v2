'use client';

import Link from 'next/link';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { AppNav } from '../components/AppNav';
import { Card, CardTitle, CardDescription } from '../components/ui/Card';

/**
 * Authenticated home. The guard routes unauthenticated users to /signin and
 * incomplete profiles to /onboarding. Feature surfaces (wall, matching, chat)
 * are added in later phases — this is the verified-student landing for now.
 */
export default function HomePage() {
  const { user, isLoading } = useRequireAuth();

  if (isLoading || !user) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-space-8 px-space-4 py-space-8 md:px-space-8">
      <AppNav />

      <div className="flex flex-col gap-space-2">
        <h1 className="text-h1 text-foreground">Welcome, {user.name.split(' ')[0]}.</h1>
        <p className="text-body text-muted-foreground">
          You&apos;re a verified student of your campus. Your social surfaces — the wall, anonymous
          matching, friends — arrive in upcoming phases.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-space-4 sm:grid-cols-2">
        <Link href="/match">
          <Card className="h-full transition-colors hover:bg-muted">
            <CardTitle>Meet someone</CardTitle>
            <CardDescription>
              Get paired with a verified student for an anonymous chat.
            </CardDescription>
          </Card>
        </Link>
        <Link href="/profile">
          <Card className="h-full transition-colors hover:bg-muted">
            <CardTitle>Your profile</CardTitle>
            <CardDescription>View and edit your identity and interests.</CardDescription>
          </Card>
        </Link>
        <Link href="/settings">
          <Card className="h-full transition-colors hover:bg-muted">
            <CardTitle>Privacy &amp; settings</CardTitle>
            <CardDescription>Control what your campus can see.</CardDescription>
          </Card>
        </Link>
      </div>
    </main>
  );
}
