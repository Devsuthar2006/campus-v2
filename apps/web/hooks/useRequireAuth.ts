'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';

/**
 * Client route guard (AUTH_SYSTEM.md §4, §8). Redirects:
 * - unauthenticated users → /signin
 * - authenticated-but-incomplete profiles → /onboarding (unless already there)
 *
 * `allowIncomplete` lets the onboarding page itself opt out of the second redirect.
 */
export function useRequireAuth(options: { allowIncomplete?: boolean } = {}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/signin');
      return;
    }
    if (!user.profileComplete && !options.allowIncomplete) {
      router.replace('/onboarding');
    }
  }, [user, isLoading, options.allowIncomplete, router]);

  return { user, isLoading };
}
