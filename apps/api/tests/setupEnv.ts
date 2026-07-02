/**
 * Test env bootstrap. Imported first by each test file so the typed config
 * schema (config/env.ts) validates before any provider module loads it. Values
 * are dummy and non-sensitive — no real credentials, database, or bucket.
 */
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgres://postgres:postgres@localhost:5432/anonymousu_test';
process.env.GOOGLE_CLIENT_ID ??= 'test-client-id.apps.googleusercontent.com';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-that-is-at-least-32-chars';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-that-is-at-least-32-chars';
// Keep the media driver 'local' so importing storage/index.ts never builds GCS.
process.env.MEDIA_DRIVER ??= 'local';
