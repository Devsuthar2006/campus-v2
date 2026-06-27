import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/env.js';
import type { SignedUpload, StorageProvider } from './provider.js';

/**
 * Local filesystem storage driver — a development stand-in for Oracle Object
 * Storage (MEDIA_SYSTEM.md §3). Bytes are written to a gitignored directory and
 * served via signed, short-lived URLs handled by the local media route. The
 * signature binds the key, operation, mime, and expiry so URLs cannot be forged
 * or repurposed. Production swaps this for an S3-compatible OCI driver.
 */

export interface LocalToken {
  key: string;
  op: 'put' | 'get';
  mime: string;
  exp: number; // epoch seconds
}

const baseDir = path.isAbsolute(config.MEDIA_LOCAL_DIR)
  ? config.MEDIA_LOCAL_DIR
  : path.resolve(process.cwd(), config.MEDIA_LOCAL_DIR);

function sign(payload: string): string {
  return createHmac('sha256', config.MEDIA_SIGNING_SECRET).update(payload).digest('base64url');
}

/** Builds an opaque, signed token: base64url(json).signature */
export function encodeToken(token: LocalToken): string {
  const body = Buffer.from(JSON.stringify(token)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Verifies and decodes a signed token; returns null if invalid/expired. */
export function decodeToken(raw: string): LocalToken | null {
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const token = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as LocalToken;
    if (token.exp * 1000 < Date.now()) return null;
    return token;
  } catch {
    return null;
  }
}

/** Resolves a storage key to an absolute path, preventing path traversal. */
export function resolveStoragePath(key: string): string {
  const resolved = path.resolve(baseDir, key);
  if (resolved !== baseDir && !resolved.startsWith(baseDir + path.sep)) {
    throw new Error('Invalid storage key');
  }
  return resolved;
}

export async function ensureDirFor(absPath: string): Promise<void> {
  await mkdir(path.dirname(absPath), { recursive: true });
}

export const localStorageProvider: StorageProvider = {
  createUploadUrl(key: string, mimeType: string): SignedUpload {
    const exp = Math.floor(Date.now() / 1000) + config.MEDIA_URL_TTL_SECONDS;
    const token = encodeToken({ key, op: 'put', mime: mimeType, exp });
    return {
      method: 'PUT',
      url: `${config.MEDIA_PUBLIC_BASE_URL}/media/local/${token}`,
      headers: { 'Content-Type': mimeType },
    };
  },

  getDownloadUrl(key: string, mimeType: string): string {
    const exp = Math.floor(Date.now() / 1000) + config.MEDIA_URL_TTL_SECONDS;
    const token = encodeToken({ key, op: 'get', mime: mimeType, exp });
    return `${config.MEDIA_PUBLIC_BASE_URL}/media/local/${token}`;
  },

  async deleteObject(key: string): Promise<void> {
    await rm(resolveStoragePath(key), { force: true });
  },
};
