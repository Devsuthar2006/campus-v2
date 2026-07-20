import { apiFetch } from './apiClient';

/**
 * Public config API client — reads feature flags without admin access.
 * Used by the app to conditionally render features (e.g., voice call button).
 */
export const configApi = {
  /** Fetch all feature flags as a key → boolean map. */
  features: () =>
    apiFetch<{ flags: Record<string, boolean> }>('/config/features').then((d) => d.flags),
};
