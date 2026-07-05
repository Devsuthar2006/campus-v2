import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Small crypto helpers (SECURITY.md §4, §9).
 * - Refresh tokens and IPs are stored only as hashes, never in the clear.
 * - Passwords are hashed with scrypt (OWASP-recommended, zero extra deps).
 */

const scryptAsync = promisify(scrypt);

/** Generates a high-entropy opaque token (used as the refresh-token secret). */
export function generateOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

/** SHA-256 hash (hex) — used for refresh-token storage and IP hashing. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Hash a password with scrypt + random salt.
 * Stored as `salt:hash` (both hex-encoded).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

/**
 * Verify a password against a stored `salt:hash` string.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const stored = Buffer.from(hash, 'hex');
  if (derived.length !== stored.length) return false;
  return timingSafeEqual(derived, stored);
}
