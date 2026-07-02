/**
 * Object-storage provider abstraction (ARCHITECTURE.md §9, MEDIA_SYSTEM.md §3).
 * Bytes live in object storage; the app only ever deals in keys and short-lived
 * signed URLs. The 'local' driver is a dev stand-in for Oracle Object Storage;
 * a production S3-compatible driver implements the same interface.
 *
 * URL signing is asynchronous: production cloud drivers (S3, Google Cloud
 * Storage) sign via async SDKs — and may perform a network round-trip when
 * signing with instance/workload credentials — while the local driver signs
 * in-process. The contract awaits signing so every driver fits without a
 * workaround.
 */

export interface SignedUpload {
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
}

export interface StorageProvider {
  /** A short-lived signed URL the client PUTs bytes to (bypassing the API). */
  createUploadUrl(key: string, mimeType: string): Promise<SignedUpload>;
  /** A short-lived signed URL for downloading/streaming the object. */
  getDownloadUrl(key: string, mimeType: string): Promise<string>;
  /** Permanently deletes the object's bytes. */
  deleteObject(key: string): Promise<void>;
}
