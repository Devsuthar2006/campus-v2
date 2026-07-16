'use client';

import { useMatchingContext } from '../components/MatchingProvider';

/**
 * Re-export the matching context hook for backwards compatibility with
 * existing components. The state is now managed globally in MatchingProvider.
 */
export function useMatching() {
  return useMatchingContext();
}
