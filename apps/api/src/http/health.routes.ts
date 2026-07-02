import { Router, type RequestHandler } from 'express';
import { sendData } from './respond.js';
import { checkDatabase } from '../db/client.js';

/**
 * Health endpoints (API_SPEC.md §2.3 envelope; PostgreSQL audit R-3).
 *
 * Two distinct signals from the one process (single-VM deployment):
 *  - Liveness  — "is the process running?" Never touches the database, so a
 *    transient DB outage does not make the process look dead and trigger a
 *    needless restart. Always 200.
 *  - Readiness — "can we serve requests right now?" Verifies the critical
 *    dependency (PostgreSQL) is reachable and the pool is usable, returning
 *    503 when it is not, so an uptime probe / deploy gate can react.
 *
 * `/health` keeps readiness semantics for the existing `/api/v1/health` probe;
 * `/health/live` and `/health/ready` are the explicit split.
 */
export const healthRouter: Router = Router();

const SERVICE = 'anonymousu-api';

/** Liveness — process is up. No dependency checks; always 200. */
const liveness: RequestHandler = (_req, res) => {
  sendData(res, {
    status: 'alive' as const,
    service: SERVICE,
    timestamp: new Date().toISOString(),
  });
};

/** Readiness — critical dependencies must be available; 200 ready / 503 not. */
const readiness: RequestHandler = async (_req, res) => {
  // Lightweight `select 1` through the connection pool — verifies connectivity
  // and pool usability without an expensive query. checkDatabase() swallows and
  // logs any driver/SQL error internally, so nothing sensitive can leak here.
  const dbReady = await checkDatabase();
  sendData(
    res,
    {
      status: dbReady ? ('ready' as const) : ('not_ready' as const),
      service: SERVICE,
      database: dbReady ? ('connected' as const) : ('unavailable' as const),
      timestamp: new Date().toISOString(),
    },
    dbReady ? 200 : 503,
  );
};

healthRouter.get('/health/live', liveness);
healthRouter.get('/health/ready', readiness);
// Backward-compatible: the existing /api/v1/health probe now reflects readiness
// (returns 503 when PostgreSQL is unavailable) instead of always reporting 200.
healthRouter.get('/health', readiness);
