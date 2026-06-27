import type {
  MediaKind,
  MediaRef,
  UploadUrlResponse,
  DownloadUrlResponse,
} from '@campusly/shared-types';
import { apiFetch } from './apiClient';

/**
 * Media client (MEDIA_SYSTEM.md §3). Implements the direct-upload flow: request
 * a signed URL, PUT the bytes straight to object storage (bypassing the API),
 * then confirm. Downloads use short-lived, access-checked signed URLs.
 */
export const mediaApi = {
  /** Full upload: request signed URL → PUT bytes → confirm. Returns the ref. */
  async upload(file: Blob, kind: MediaKind, durationMs?: number): Promise<MediaRef> {
    const mimeType = file.type || 'application/octet-stream';
    const { media, upload } = await apiFetch<UploadUrlResponse>('/media/upload-url', {
      method: 'POST',
      body: JSON.stringify({ kind, mimeType, sizeBytes: file.size, durationMs }),
    });

    // Bytes go directly to (object) storage — never through the JSON API.
    const res = await fetch(upload.url, {
      method: upload.method,
      headers: upload.headers,
      body: file,
    });
    if (!res.ok) throw new Error('Upload failed');

    const confirmed = await apiFetch<{ media: MediaRef }>(`/media/${media.id}/confirm`, {
      method: 'POST',
    });
    return confirmed.media;
  },

  /** Access-checked signed download URL for rendering/playback. */
  async getUrl(mediaId: string): Promise<string> {
    const data = await apiFetch<DownloadUrlResponse>(`/media/${mediaId}/url`);
    return data.url;
  },

  async remove(mediaId: string): Promise<void> {
    await apiFetch(`/media/${mediaId}`, { method: 'DELETE' });
  },
};
