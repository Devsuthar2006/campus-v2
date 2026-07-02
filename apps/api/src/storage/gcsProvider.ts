import { Storage, type GetSignedUrlConfig } from '@google-cloud/storage';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../domain/errors.js';
import { ERROR_CODES } from '@campusly/shared-types';
import type { SignedUpload, StorageProvider } from './provider.js';

/**
 * Google Cloud Storage driver (MEDIA_SYSTEM.md §3, ARCHITECTURE.md §9). The
 * production stand-in for the local dev driver: bytes live in a GCS bucket and
 * are transferred directly between the client and GCS via V4 signed URLs — they
 * never transit the API. This provider only mints those URLs and deletes
 * objects; it holds no business rules and generates no keys (it receives the
 * caller's `storageKey` verbatim).
 *
 * Authentication is Application Default Credentials (ADC): on a GCE VM the
 * attached service account is used automatically; locally, developers off-GCP
 * may set GOOGLE_APPLICATION_CREDENTIALS and the SDK/ADC picks it up. Credentials
 * are never read, parsed, or logged here — the SDK resolves them.
 */

export interface GcsProviderOptions {
  /** Bucket name (plain, no 'gs://'). Defaults to config.GCS_BUCKET. */
  bucket?: string;
  /** GCP project ID. Defaults to config.GCS_PROJECT_ID; omitted lets ADC resolve it. */
  projectId?: string;
  /** Pre-built Storage client — injected in tests so no real ADC/bucket is needed. */
  client?: Storage;
}

/**
 * Builds the GCS provider, reusing a single Storage client for its lifetime.
 * Fails fast at construction (invoked from selectProvider at startup) when
 * required configuration is missing, so misconfiguration never reaches the
 * first upload request.
 */
export function createGcsProvider(options: GcsProviderOptions = {}): StorageProvider {
  const bucketName = options.bucket ?? config.GCS_BUCKET;
  const projectId = options.projectId ?? config.GCS_PROJECT_ID;

  // Required configuration — fail fast with a clear, non-sensitive message.
  if (!bucketName) {
    const message = 'GCS storage driver requires GCS_BUCKET to be configured.';
    logger.error({ driver: 'gcs' }, message);
    throw new Error(message);
  }

  let client: Storage;
  try {
    // ADC only: no credentials are passed. projectId is optional — when omitted
    // ADC resolves it from the environment (GCE metadata server / credentials).
    client = options.client ?? new Storage(projectId ? { projectId } : {});
  } catch (err) {
    logger.error({ err, driver: 'gcs' }, 'GCS storage client initialization failed');
    throw new AppError(ERROR_CODES.SERVER_ERROR, 'Failed to initialize object storage.');
  }

  const bucket = client.bucket(bucketName);

  /** Signs a short-lived V4 URL, translating SDK errors into the app hierarchy. */
  async function sign(
    key: string,
    action: 'read' | 'write',
    contentType?: string,
  ): Promise<string> {
    // One TTL governs both directions (MEDIA_URL_TTL_SECONDS) — no second TTL.
    const cfg: GetSignedUrlConfig = {
      version: 'v4',
      action,
      expires: Date.now() + config.MEDIA_URL_TTL_SECONDS * 1000,
    };
    // Bind the Content-Type so the client's PUT must send the exact MIME type
    // the backend approved — arbitrary types are rejected by GCS at upload.
    if (contentType) cfg.contentType = contentType;

    try {
      const [url] = await bucket.file(key).getSignedUrl(cfg);
      return url;
    } catch (err) {
      logger.error({ err, key, action }, 'GCS signed URL generation failed');
      throw new AppError(ERROR_CODES.SERVER_ERROR, 'Failed to generate a media URL.');
    }
  }

  return {
    async createUploadUrl(key: string, mimeType: string): Promise<SignedUpload> {
      const url = await sign(key, 'write', mimeType);
      return {
        method: 'PUT',
        url,
        headers: { 'Content-Type': mimeType },
      };
    },

    async getDownloadUrl(key: string, _mimeType: string): Promise<string> {
      // The object's stored Content-Type is served by GCS on GET, so the mime
      // hint is unused here (kept for interface parity with the local driver).
      return sign(key, 'read');
    },

    async deleteObject(key: string): Promise<void> {
      try {
        // Treat a missing object as success so cleanup/delete stays idempotent.
        await bucket.file(key).delete({ ignoreNotFound: true });
      } catch (err) {
        logger.error({ err, key }, 'GCS object deletion failed');
        throw new AppError(ERROR_CODES.SERVER_ERROR, 'Failed to delete media object.');
      }
    },
  };
}
