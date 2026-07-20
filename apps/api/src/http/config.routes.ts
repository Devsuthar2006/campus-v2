import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';
import { sendData } from './respond.js';
import { adminRepository } from '../repositories/adminRepository.js';

/**
 * Public config endpoint — exposes feature flag state to authenticated clients
 * so the UI can conditionally render features (e.g., voice call button).
 * No admin role required; read-only.
 */
export const configRouter: Router = Router();

/** GET /config/features — list enabled/disabled feature flags. */
configRouter.get(
  '/config/features',
  asyncHandler(async (_req, res) => {
    const rows = await adminRepository.listFlags();
    const flags: Record<string, boolean> = {};
    for (const row of rows) {
      flags[row.key] = row.isEnabled;
    }
    sendData(res, { flags });
  }),
);
