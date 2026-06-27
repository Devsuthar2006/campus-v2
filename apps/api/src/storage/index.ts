import { config } from '../config/env.js';
import type { StorageProvider } from './provider.js';
import { localStorageProvider } from './localProvider.js';

/**
 * Selects the active object-storage driver (ARCHITECTURE.md §9). 'local' is the
 * dev stand-in; 's3' (Oracle Object Storage, S3-compatible) is the production
 * driver — wired here once credentials are configured.
 */
function selectProvider(): StorageProvider {
  switch (config.MEDIA_DRIVER) {
    case 'local':
      return localStorageProvider;
    case 's3':
      // Production OCI/S3 driver is introduced at deployment (Phase 15).
      throw new Error('S3 storage driver not configured in this environment.');
    default:
      return localStorageProvider;
  }
}

export const storage: StorageProvider = selectProvider();
