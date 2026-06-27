'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { ConstellationBackground } from '../components/landing/ConstellationBackground';
import { cn } from '../lib/utils';

/**
 * Public landing / welcome page — the first impression for a visitor. Premium
 * dark hero with an animated "constellation" backdrop (students connecting),
 * the Campusly wordmark in the display face, and a single clear call to action.
 * Signed-in users are sent straight into the app.
 */
export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace('/wall');
  }, [user, isLoading, router]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  // While auth resolves (or a signed-in user is being redirected), render the
  // dark canvas only — avoids a flash of marketing content for logged-in users.
  const showContent = !isLoading && !user;

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background text-foreground">
      <ConstellationBackground />

      {/* Calm overlay keeps the hero text legible over the animation. */}
      <div className="pointer-events-none absolute inset-0 bg-background/40" aria-hidden />

      {showContent && (
        <div
          className={cn(
            'relative z-10 flex min-h-screen flex-col transition-all duration-700',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
          )}
        >
          {/* Top bar */}
          <header className="flex items-center justify-between px-space-5 py-space-5 md:px-space-12">
            <span className="font-display text-h3 font-bold tracking-tight">
              Campus<span className="text-brand">ly</span>
            </span>
            <Link
              href="/signin"
              className="text-caption text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          </header>

          {/* Hero */}
          <main className="flex flex-1 flex-col items-center justify-center px-space-5 text-center">
            <span className="mb-space-6 inline-flex items-center gap-space-2 rounded-tooltip border border-border bg-surface/60 px-space-3 py-space-1 text-small text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
              Verified students only
            </span>

            <h1 className="font-display text-display tracking-tight">
              Campus<span className="text-brand">ly</span>
            </h1>

            <p className="mt-space-5 max-w-xl text-h3 font-normal text-foreground/90">
              Meet someone new. Make real friends. Belong to your campus.
            </p>
            <p className="mt-space-3 max-w-md text-body text-muted-foreground">
              India&apos;s verified, student-only social platform — anonymous matching, lasting
              friendships, and a campus wall that&apos;s actually yours.
            </p>

            <div className="mt-space-8 flex flex-col items-center gap-space-3 sm:flex-row">
              <Link
                href="/signin"
                className="inline-flex h-12 items-center justify-center rounded-button bg-brand px-space-8 text-body font-semibold text-brand-foreground transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Enter Campusly
              </Link>
              <span className="text-small text-muted-foreground">
                Free for every student · Sign in with your college Google account
              </span>
            </div>

            {/* Feature chips expressing the product */}
            <div className="mt-space-12 flex flex-wrap items-center justify-center gap-space-3">
              {[
                { title: 'Anonymous matching', desc: 'Meet a random verified student' },
                { title: 'Real friendships', desc: 'Turn a chat into a connection' },
                { title: 'Campus wall', desc: 'Your campus, one trusted feed' },
              ].map((f) => (
                <div
                  key={f.title}
                  className="flex w-56 flex-col gap-space-1 rounded-card border border-border bg-surface/50 px-space-4 py-space-3 text-left"
                >
                  <span className="text-body font-medium text-foreground">{f.title}</span>
                  <span className="text-caption text-muted-foreground">{f.desc}</span>
                </div>
              ))}
            </div>
          </main>

          <footer className="px-space-5 py-space-6 text-center text-small text-muted-foreground">
            Built for campuses. Private by design. Accountable by verification.
          </footer>
        </div>
      )}
    </div>
  );
}
