import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { universities } from './schema.js';
import { UNIVERSITY_SEED } from './seeds/universities.js';

/**
 * Standalone reference-data seed runner (DATABASE_SCHEMA.md §5.1).
 *
 * Populates the `universities` table (recognized campuses) required for Google
 * sign-in eligibility. Like the migration runner, this is an EXPLICIT deploy
 * step — run AFTER migrations, never during application boot — and depends only
 * on production packages (`drizzle-orm` + `postgres`), so it runs under a pruned
 * `npm ci --omit=dev` install. It opens its own single-use connection, separate
 * from the app pool in `client.ts`, and closes it when done.
 *
 * Idempotent: upserts by the unique `name` constraint, so re-running inserts new
 * campuses and refreshes the domains/metadata of existing ones without creating
 * duplicates.
 */
async function main(): Promise<void> {
  const seedClient = postgres(config.DATABASE_URL, { max: 1 });
  const db = drizzle(seedClient);

  try {
    for (const u of UNIVERSITY_SEED) {
      // Normalize to the bare host the sign-in lookup uses: lowercase, no '@'.
      const emailDomains = u.emailDomains.map((d) => d.trim().toLowerCase().replace(/^@/, ''));
      await db
        .insert(universities)
        .values({
          name: u.name,
          shortName: u.shortName ?? null,
          emailDomains,
          city: u.city ?? null,
          state: u.state ?? null,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: universities.name,
          set: {
            shortName: u.shortName ?? null,
            emailDomains,
            city: u.city ?? null,
            state: u.state ?? null,
            isActive: true,
            updatedAt: sql`now()`,
          },
        });
      logger.info({ name: u.name, emailDomains }, 'Seeded university');
    }
    logger.info({ count: UNIVERSITY_SEED.length }, 'University seed complete');
  } finally {
    await seedClient.end({ timeout: 5 });
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, 'University seed failed');
    process.exit(1);
  });
