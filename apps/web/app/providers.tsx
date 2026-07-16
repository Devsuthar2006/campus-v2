'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '../components/AuthProvider';
import { InstallPrompt } from '../components/InstallPrompt';
import { AppTour } from '../components/AppTour';
import { MatchingProvider } from '../components/MatchingProvider';

/**
 * Client-side providers: React Query (server state), theme (dark-first,
 * color-inversion only — UI_GUIDELINES.md §4), and auth (AUTH_SYSTEM.md).
 * One QueryClient per app instance.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <AuthProvider>
          <MatchingProvider>
            {children}
            <InstallPrompt />
            <AppTour />
          </MatchingProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
