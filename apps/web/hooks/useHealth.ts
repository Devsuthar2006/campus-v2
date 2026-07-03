import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient';

interface HealthResponse {
  status: string;
  service: string;
  database: string;
  timestamp: string;
}

/** Polls the API health endpoint — used by the Phase 00 connectivity smoke test. */
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    // /health is public — poll it without attaching or requiring a user token.
    queryFn: () => apiFetch<HealthResponse>('/health', { skipAuth: true }),
    refetchInterval: 15_000,
  });
}
