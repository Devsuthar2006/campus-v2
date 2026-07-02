import { config } from '../config/env.js';
import type { StorageProvider } from './provider.js';
import { localStorageProvider } from './localProvider.js';
import { createGcsProvider } from './gcsProvider.js';

/**
 * Selects the active object-storage driver (ARCHITECTURE.md §9). 'local' is the
 * dev stand-in; 'gcs' (Google Cloud Storage) is the production driver. The GCS
 * provider is built lazily (only when selected) and fails fast at startup if its
 * configuration is missing.
 */
function selectProvider(): StorageProvider {
  switch (config.MEDIA_DRIVER) {
    case 'local':
      return localStorageProvider;
    case 'gcs':
      return createGcsProvider();
    default:
      return localStorageProvider;
  }
}

export const storage: StorageProvider = selectProvider();
