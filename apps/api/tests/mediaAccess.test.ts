import './setupEnv.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AccessTokenClaims } from '@campusly/shared-types';
import type { MediaAssetRow } from '../src/db/schema.js';
import { mediaService } from '../src/services/mediaService.js';
import { mediaRepository } from '../src/repositories/mediaRepository.js';
import { storage } from '../src/storage/index.js';
import { NotFoundError, ForbiddenError } from '../src/domain/errors.js';

/**
 * Authorization matrix for GET /media/:id/url (mediaService.getDownloadUrl →
 * canAccess). Regression cover for the wall-media bug (MEDIA_SYSTEM.md §4, §9):
 * a public wall post's image must resolve for ANY same-campus viewer, not only
 * its uploader, while private/unattached media stays owner-only. Repositories
 * and storage are stubbed per-test (t.mock auto-restores) — no DB or network.
 */

const UNI_A = '11111111-1111-1111-1111-111111111111';
const UNI_B = '22222222-2222-2222-2222-222222222222';
const OWNER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const VIEWER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MEDIA_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

function claims(overrides: Partial<AccessTokenClaims> = {}): AccessTokenClaims {
  return {
    sub: VIEWER_ID,
    role: 'student',
    status: 'active',
    universityId: UNI_A,
    ...overrides,
  };
}

function imageMedia(overrides: Partial<MediaAssetRow> = {}): MediaAssetRow {
  return {
    id: MEDIA_ID,
    ownerId: OWNER_ID,
    storageKey: 'image/obj-key',
    kind: 'image',
    mimeType: 'image/png',
    sizeBytes: 1024,
    durationMs: null,
    metadata: null,
    isTemporary: false,
    expiresAt: null,
    status: 'active',
    createdAt: new Date(),
    ...overrides,
  };
}

/** Stubs a wall post referencing the media, scoped to the given university. */
function stubWallAttachment(t: { mock: typeof import('node:test').mock }, universityIds: string[]) {
  t.mock.method(mediaRepository, 'messageIdsForMedia', async () => [] as string[]);
  t.mock.method(mediaRepository, 'universityIdsForMedia', async () => universityIds);
  t.mock.method(storage, 'getDownloadUrl', async () => 'https://storage.example/signed');
}

test('media: author resolves media attached to their own public wall post', async (t) => {
  t.mock.method(mediaRepository, 'findById', async () => imageMedia());
  stubWallAttachment(t, [UNI_A]);

  const res = await mediaService.getDownloadUrl(
    claims({ sub: OWNER_ID, universityId: UNI_A }),
    MEDIA_ID,
  );
  assert.equal(res.url, 'https://storage.example/signed');
});

test('media: a different same-campus viewer resolves public wall-post media (regression)', async (t) => {
  // The exact production bug: viewer is NOT the uploader but shares the campus.
  t.mock.method(mediaRepository, 'findById', async () => imageMedia());
  stubWallAttachment(t, [UNI_A]);

  const res = await mediaService.getDownloadUrl(
    claims({ sub: VIEWER_ID, universityId: UNI_A }),
    MEDIA_ID,
  );
  assert.equal(res.url, 'https://storage.example/signed');
});

test('media: viewer from another campus cannot resolve wall-post media (privacy preserved)', async (t) => {
  t.mock.method(mediaRepository, 'findById', async () => imageMedia());
  stubWallAttachment(t, [UNI_A]);

  await assert.rejects(
    () => mediaService.getDownloadUrl(claims({ sub: VIEWER_ID, universityId: UNI_B }), MEDIA_ID),
    (err: unknown) => err instanceof ForbiddenError,
  );
});

test('media: unattached/pending media stays owner-only (non-owner denied)', async (t) => {
  // No wall post and no chat context reference this media.
  t.mock.method(mediaRepository, 'findById', async () => imageMedia({ status: 'active' }));
  t.mock.method(mediaRepository, 'messageIdsForMedia', async () => [] as string[]);
  t.mock.method(mediaRepository, 'universityIdsForMedia', async () => [] as string[]);

  await assert.rejects(
    () => mediaService.getDownloadUrl(claims({ sub: VIEWER_ID, universityId: UNI_A }), MEDIA_ID),
    (err: unknown) => err instanceof ForbiddenError,
  );
});

test('media: deleted media returns not-found for everyone', async (t) => {
  t.mock.method(mediaRepository, 'findById', async () => imageMedia({ status: 'deleted' }));

  await assert.rejects(
    () => mediaService.getDownloadUrl(claims({ sub: OWNER_ID, universityId: UNI_A }), MEDIA_ID),
    (err: unknown) => err instanceof NotFoundError,
  );
});

test('media: expired media returns not-found', async (t) => {
  t.mock.method(mediaRepository, 'findById', async () => imageMedia({ status: 'expired' }));

  await assert.rejects(
    () => mediaService.getDownloadUrl(claims({ sub: VIEWER_ID, universityId: UNI_A }), MEDIA_ID),
    (err: unknown) => err instanceof NotFoundError,
  );
});
