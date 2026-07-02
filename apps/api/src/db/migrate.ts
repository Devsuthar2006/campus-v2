import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Standalone migration runner (DATABASE_SCHEMA.md §26.7, INFRASTRUCTURE.md §12).
 *
 * Applies the committed, forward-only SQL migrations to the database. This is an
 * EXPLICIT deploy step — run BEFORE the backend service starts — never invoked
 * during application boot. Deployments are deterministic: migrate, then start.
 *
 * It depends only on production packages (`drizzle-orm` + `postgres`), so it runs
 * under a pruned `npm ci --omit=dev` install — unlike `drizzle-kit` (a dev-only
 * CLI). It opens its own single-use connection, distinct from the app's pool in
 * `client.ts`, and closes it when done.
 */

// The generated `.sql` files + `meta/_journal.json` live in the source tree and
// are not copied into `dist/`, so resolve the folder relative to this module
// back to `src/db/migrations` — correct whether run compiled or via tsx.
const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = here.includes(`${path.sep}dist${path.sep}`)
  ? path.resolve(here, '../../src/db/migrations')
  : path.resolve(here, './migrations');

async function main(): Promise<void> {
  // A dedicated, single connection for the migration session (drizzle guidance);
  // never the shared application pool.
  const migrationClient = postgres(config.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient);

  logger.info({ migrationsFolder }, 'Running database migrations');
  try {
    await migrate(db, { migrationsFolder });
    logger.info('Database migrations complete');
  } finally {
    await migrationClient.end({ timeout: 5 });
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, 'Database migration failed');
    process.exit(1);
  });
