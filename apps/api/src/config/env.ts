import 'dotenv/config';
import { z } from 'zod';

/**
 * Typed, validated environment configuration (SECURITY.md §10, CODING_STANDARDS.md §13.5).
 * No secret is ever hardcoded; everything comes from the environment and is
 * validated once at startup so the process fails fast on misconfiguration.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Authentication (AUTH_SYSTEM.md §3–5). Secrets are never hardcoded.
  GOOGLE_CLIENT_ID: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  /** Access-token lifetime in seconds (short-lived — AUTH_SYSTEM.md §5). */
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  /** Refresh-token lifetime in days (longer-lived, rotated, revocable). */
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /** Grace window (days) for account-deletion recovery before PII purge (AUTH_SYSTEM.md §8). */
  ACCOUNT_DELETION_GRACE_DAYS: z.coerce.number().int().positive().default(14),
  /**
   * DEV-ONLY: when true, sign-ins from unrecognized email domains are accepted
   * and attached to a fallback "Open Campus (Dev)" university instead of being
   * rejected. MUST be false in production (defeats verified-students-only).
   */
  AUTH_ALLOW_ANY_DOMAIN: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Media (MEDIA_SYSTEM.md, ARCHITECTURE.md §9). Bytes live in object storage;
  // only references live in PostgreSQL. Supported drivers:
  //   - 'local': dev stand-in that stores bytes on disk and serves them via
  //     signed, short-lived URLs (default; requires no cloud configuration).
  //   - 'gcs':   production driver backed by Google Cloud Storage, authenticated
  //     via Application Default Credentials (GCE VM service account). Config is
  //     prepared here; the provider itself is implemented in a follow-up task.
  MEDIA_DRIVER: z.enum(['local', 'gcs']).default('local'),
  /** Secret used to sign local upload/download URLs (dev driver only). */
  MEDIA_SIGNING_SECRET: z.string().min(16).default('dev-only-media-signing-secret-change'),
  /** On-disk directory for the local media driver. */
  MEDIA_LOCAL_DIR: z.string().default('.media-storage'),
  /** Public base URL the client uses to reach signed media endpoints. */
  MEDIA_PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000'),
  /** Signed-URL validity in seconds (short-lived — MEDIA_SYSTEM.md §9). */
  MEDIA_URL_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  /** Temporary-media retention before expiry/cleanup, in hours (~48h). */
  MEDIA_TEMP_TTL_HOURS: z.coerce.number().int().positive().default(48),

  // Google Cloud Storage (MEDIA_DRIVER=gcs). Bytes live in a GCS bucket; the
  // client uploads/downloads directly via V4 signed URLs (bytes never transit
  // the API — MEDIA_SYSTEM.md §3). Authentication uses Application Default
  // Credentials (ADC): in production the GCE VM's attached service account,
  // with no key file required. Locally, developers off-GCP may point
  // GOOGLE_APPLICATION_CREDENTIALS at a service-account JSON (ADC picks it up
  // automatically — it is intentionally not read here). These values are
  // optional at the schema level so 'local' dev never needs them; the GCS
  // provider validates their presence at init when MEDIA_DRIVER=gcs.
  /** Target GCS bucket name for media objects (no 'gs://' prefix, no URL). */
  GCS_BUCKET: z.string().min(1).optional(),
  /**
   * GCP project ID. Optional: ADC usually resolves it from the environment
   * (GCE metadata server / credentials); set it to pin an explicit project.
   */
  GCS_PROJECT_ID: z.string().min(1).optional(),
});

function loadConfig() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Surface which keys are wrong without printing their (possibly secret) values.
    const issues = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }
  return parsed.data;
}

export const config = loadConfig();

export type AppConfig = typeof config;

export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';
