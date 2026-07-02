import './setupEnv.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Storage } from '@google-cloud/storage';
import { config } from '../src/config/env.js';
import { AppError } from '../src/domain/errors.js';
import { createGcsProvider } from '../src/storage/gcsProvider.js';

/**
 * GCS driver behaviour with a mocked Storage client — no real bucket, ADC, or
 * network. The mock records the arguments the provider passes to the SDK so we
 * can assert V4 signing config, Content-Type binding, and delete semantics.
 */

interface SignCall {
  key: string;
  cfg: {
    version?: string;
    action?: string;
    expires?: number | string | Date;
    contentType?: string;
  };
}
interface DeleteCall {
  key: string;
  options?: { ignoreNotFound?: boolean };
}

/** Builds a fake Storage whose file ops are driven by injectable handlers. */
function makeMockStorage(handlers: {
  onSign?: (call: SignCall) => Promise<[string]>;
  onDelete?: (call: DeleteCall) => Promise<unknown>;
}): { client: Storage; signCalls: SignCall[]; deleteCalls: DeleteCall[]; bucketNames: string[] } {
  const signCalls: SignCall[] = [];
  const deleteCalls: DeleteCall[] = [];
  const bucketNames: string[] = [];

  const client = {
    bucket(name: string) {
      bucketNames.push(name);
      return {
        file(key: string) {
          return {
            async getSignedUrl(cfg: SignCall['cfg']) {
              signCalls.push({ key, cfg });
              return handlers.onSign
                ? handlers.onSign({ key, cfg })
                : ([`https://storage.googleapis.com/${name}/${key}?signed`] as [string]);
            },
            async delete(options?: DeleteCall['options']) {
              deleteCalls.push({ key, options });
              return handlers.onDelete ? handlers.onDelete({ key, options }) : [{}];
            },
          };
        },
      };
    },
  } as unknown as Storage;

  return { client, signCalls, deleteCalls, bucketNames };
}

const BUCKET = 'test-bucket';

test('gcs: provider initializes when bucket is configured', () => {
  const { client } = makeMockStorage({});
  assert.doesNotThrow(() => createGcsProvider({ bucket: BUCKET, client }));
});

test('gcs: missing bucket fails fast at construction', () => {
  const { client } = makeMockStorage({});
  assert.throws(() => createGcsProvider({ bucket: undefined, client }), /GCS_BUCKET/);
});

test('gcs: createUploadUrl produces a V4 PUT URL binding the Content-Type', async () => {
  const { client, signCalls, bucketNames } = makeMockStorage({});
  const provider = createGcsProvider({ bucket: BUCKET, client });

  const before = Date.now();
  const upload = await provider.createUploadUrl('avatar/abc', 'image/png');
  const after = Date.now();

  assert.equal(upload.method, 'PUT');
  assert.equal(upload.headers['Content-Type'], 'image/png');
  assert.ok(upload.url.includes(BUCKET));
  assert.equal(bucketNames[0], BUCKET);

  const call = signCalls[0];
  assert.ok(call, 'getSignedUrl was called');
  assert.equal(call.key, 'avatar/abc');
  assert.equal(call.cfg.version, 'v4');
  assert.equal(call.cfg.action, 'write');
  assert.equal(call.cfg.contentType, 'image/png', 'upload URL restricts Content-Type');
  // Expiry uses MEDIA_URL_TTL_SECONDS (the single, shared TTL).
  const expires = Number(call.cfg.expires);
  assert.ok(expires >= before + config.MEDIA_URL_TTL_SECONDS * 1000);
  assert.ok(expires <= after + config.MEDIA_URL_TTL_SECONDS * 1000);
});

test('gcs: getDownloadUrl produces a V4 GET URL without a contentType constraint', async () => {
  const { client, signCalls } = makeMockStorage({});
  const provider = createGcsProvider({ bucket: BUCKET, client });

  const url = await provider.getDownloadUrl('avatar/abc', 'image/png');
  assert.ok(url.includes('avatar/abc'));

  const call = signCalls[0];
  assert.ok(call, 'getSignedUrl was called');
  assert.equal(call.cfg.version, 'v4');
  assert.equal(call.cfg.action, 'read');
  assert.equal(call.cfg.contentType, undefined, 'download URL does not pin Content-Type');
});

test('gcs: deleteObject passes ignoreNotFound (missing object is success)', async () => {
  const { client, deleteCalls } = makeMockStorage({});
  const provider = createGcsProvider({ bucket: BUCKET, client });

  await assert.doesNotReject(() => provider.deleteObject('avatar/abc'));
  const call = deleteCalls[0];
  assert.ok(call, 'delete was called');
  assert.equal(call.key, 'avatar/abc');
  assert.equal(call.options?.ignoreNotFound, true);
});

test('gcs: signing failures surface as an AppError, not a raw SDK error', async () => {
  const { client } = makeMockStorage({
    onSign: async () => {
      throw new Error('boom: credentials could not be loaded');
    },
  });
  const provider = createGcsProvider({ bucket: BUCKET, client });

  await assert.rejects(
    () => provider.createUploadUrl('avatar/abc', 'image/png'),
    (err: unknown) => {
      assert.ok(err instanceof AppError, 'wrapped in AppError');
      assert.equal(err.code, 'server_error');
      // The raw SDK message (with credential details) is not leaked.
      assert.doesNotMatch(err.message, /credentials/);
      return true;
    },
  );
});

test('gcs: delete failures surface as an AppError', async () => {
  const { client } = makeMockStorage({
    onDelete: async () => {
      throw new Error('boom: permission denied');
    },
  });
  const provider = createGcsProvider({ bucket: BUCKET, client });

  await assert.rejects(
    () => provider.deleteObject('avatar/abc'),
    (err: unknown) => err instanceof AppError && err.code === 'server_error',
  );
});

test('gcs: explicit projectId is accepted (ADC still supplies credentials)', () => {
  const { client } = makeMockStorage({});
  assert.doesNotThrow(() => createGcsProvider({ bucket: BUCKET, projectId: 'my-proj', client }));
});
