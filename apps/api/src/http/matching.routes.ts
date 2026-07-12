import { Router } from 'express';
import { z } from 'zod';
import {
  REPORT_REASONS,
  type MatchStatusResponse,
  type MatchHistoryItem,
} from '@campusly/shared-types';
import { asyncHandler } from './asyncHandler.js';
import { sendData } from './respond.js';
import { requireAuth, getAuth } from '../middleware/requireAuth.js';
import { matchingService } from '../services/matchingService.js';
import { matchingRepository } from '../repositories/matchingRepository.js';
import { logger } from '../config/logger.js';

/**
 * Matching REST endpoints (API_SPEC.md §5). Live matching flows over Socket.IO
 * (SOCKET_EVENTS.md §4); these endpoints cover reconnection status, reporting,
 * and history.
 */
export const matchingRouter: Router = Router();

matchingRouter.use(requireAuth);

/** GET /matching/status — current matching state (for reconnection). */
matchingRouter.get(
  '/matching/status',
  asyncHandler(async (req, res) => {
    const active = await matchingRepository.getActiveSessionForUser(getAuth(req).sub);
    const body: MatchStatusResponse = active
      ? { state: 'in_session', sessionId: active.sessionId }
      : { state: 'idle', sessionId: null };
    sendData(res, body);
  }),
);

/** POST /matching/report — report a match partner; ends the session. */
const ReportSchema = z.object({
  sessionId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional(),
});

matchingRouter.post(
  '/matching/report',
  asyncHandler(async (req, res) => {
    logger.info({ body: req.body, user: getAuth(req).sub }, 'Received match report request');
    const { sessionId, reason, details } = ReportSchema.parse(req.body);
    await matchingService.reportMatch(sessionId, getAuth(req).sub, reason, details);
    sendData(res, { success: true });
  }),
);

/** GET /matching/history — the user's recent match summary. */
matchingRouter.get(
  '/matching/history',
  asyncHandler(async (req, res) => {
    const rows = await matchingRepository.historyForUser(getAuth(req).sub);
    const items: MatchHistoryItem[] = rows.map((r) => ({
      sessionId: r.sessionId,
      durationSeconds: r.durationSeconds,
      becameFriends: r.becameFriends,
      createdAt: r.createdAt.toISOString(),
    }));
    sendData(res, { items });
  }),
);
