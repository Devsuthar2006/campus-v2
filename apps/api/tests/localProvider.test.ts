import './setupEnv.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../src/config/env.js';
import { localStorageProvider, decodeToken } from '../src/storage/localProvider.js';

/**
 * Local driver behaviour — the contract the GCS driver must preserve. Signing
 * is in-process HMAC, so these run with no filesystem or network access.
 */

/** Extracts and decodes the signed token embedded in a local media URL. */
function tokenFromUrl(url: string) {
  const parts = url.split('/media/local/');
  assert.equal(parts.length, 2, 'URL contains a local media token');
  const raw = parts[1];
  assert.ok(raw, 'token segment is present');
  const token = decodeToken(raw);
  assert.ok(token, 'URL carries a valid signed token');
  return token;
}

test('local: createUploadUrl returns a signed PUT with the requested Content-Type', async () => {
  const upload = await localStorageProvider.createUploadUrl('avatar/abc', 'image/png');
  assert.equal(upload.method, 'PUT');
  assert.equal(upload.headers['Content-Type'], 'image/png');
  assert.ok(upload.url.startsWith(`${config.MEDIA_PUBLIC_BASE_URL}/media/local/`));

  const token = tokenFromUrl(upload.url);
  assert.equal(token.op, 'put');
  assert.equal(token.key, 'avatar/abc');
  assert.equal(token.mime, 'image/png');
});

test('local: getDownloadUrl returns a signed GET URL for the key', async () => {
  const url = await localStorageProvider.getDownloadUrl('avatar/abc', 'image/png');
  assert.ok(url.startsWith(`${config.MEDIA_PUBLIC_BASE_URL}/media/local/`));
  const token = tokenFromUrl(url);
  assert.equal(token.op, 'get');
  assert.equal(token.key, 'avatar/abc');
});

test('local: deleteObject on a missing key resolves (force:true)', async () => {
  await assert.doesNotReject(() => localStorageProvider.deleteObject('avatar/does-not-exist'));
});
