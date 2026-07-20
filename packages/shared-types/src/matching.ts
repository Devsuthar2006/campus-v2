/**
 * Anonymous matching contracts (MATCHING_ENGINE.md, SOCKET_EVENTS.md §4,
 * DATABASE_SCHEMA.md §7). Shared by api and web.
 */

/** Client → server socket events (commands). */
export const MATCH_CLIENT_EVENTS = {
  JOIN_QUEUE: 'join_queue',
  LEAVE_QUEUE: 'leave_queue',
  LEAVE_SESSION: 'leave_session',
  HEARTBEAT: 'heartbeat',
  CHECK_SESSION: 'check_session',
} as const;

/** Server → client socket events (facts/notifications). */
export const MATCH_SERVER_EVENTS = {
  QUEUE_STATUS: 'queue_status',
  MATCH_FOUND: 'match_found',
  MATCH_CANCELLED: 'match_cancelled',
  MATCH_TIMEOUT: 'match_timeout',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
} as const;

/** Matching lifecycle state as seen by a client (for status reconciliation). */
import type { PublicUserSummary } from './friends.js';
export type MatchState = 'idle' | 'waiting' | 'in_session';
export type MatchMode = 'text' | 'voice';

export interface QueueStatusPayload {
  status: 'waiting';
  waitingCount?: number;
}

export interface MatchFoundPayload {
  sessionId: string;
}

export interface SessionStartedPayload {
  sessionId: string;
  startedAt: string;
  partner?: PublicUserSummary | null;
  matchMode?: MatchMode;
  isCaller?: boolean;
}

export type SessionEndReason = 'left' | 'disconnect' | 'expired' | 'reported';

export interface SessionEndedPayload {
  sessionId: string;
  reason: SessionEndReason;
}

export interface MatchCancelledPayload {
  reason: string;
}

/** GET /matching/status — current matching state (reconnection support). */
export interface MatchStatusResponse {
  state: MatchState;
  sessionId: string | null;
}

/** POST /matching/report — report a match partner. */
export const REPORT_REASONS = ['spam', 'harassment', 'hate', 'nsfw', 'safety', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface ReportMatchInput {
  sessionId: string;
  reason: ReportReason;
  details?: string;
}

/** A row in GET /matching/history. */
export interface MatchHistoryItem {
  sessionId: string | null;
  durationSeconds: number | null;
  becameFriends: boolean;
  createdAt: string;
}

// ─── WebRTC Voice Call Signaling (peer-to-peer within a match session) ───

/** Client → server: voice call signaling commands. */
export const VOICE_CALL_CLIENT_EVENTS = {
  /** Initiate a call (sends WebRTC SDP offer to the partner). */
  CALL_OFFER: 'call_offer',
  /** Accept the call (sends WebRTC SDP answer back). */
  CALL_ANSWER: 'call_answer',
  /** Exchange ICE candidates for NAT traversal. */
  ICE_CANDIDATE: 'ice_candidate',
  /** Hang up / end the call. */
  CALL_END: 'call_end',
} as const;

/** Server → client: voice call signaling notifications. */
export const VOICE_CALL_SERVER_EVENTS = {
  /** Relay the SDP offer to the callee. */
  CALL_OFFER: 'call_offer',
  /** Relay the SDP answer to the caller. */
  CALL_ANSWER: 'call_answer',
  /** Relay an ICE candidate to the peer. */
  ICE_CANDIDATE: 'ice_candidate',
  /** Notify that the peer ended the call. */
  CALL_ENDED: 'call_ended',
} as const;

/** Payload for call_offer (client→server and server→client). */
export interface CallOfferPayload {
  contextType: 'anon_session' | 'friendship';
  contextId: string;
  sessionId?: string; // deprecated
  sdp: string;
}

/** Payload for call_answer (client→server and server→client). */
export interface CallAnswerPayload {
  contextType: 'anon_session' | 'friendship';
  contextId: string;
  sessionId?: string; // deprecated
  sdp: string;
}

/** Payload for ice_candidate (client→server and server→client). */
export interface IceCandidatePayload {
  contextType: 'anon_session' | 'friendship';
  contextId: string;
  sessionId?: string; // deprecated
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

/** Payload for call_ended (server→client). */
export interface CallEndedPayload {
  contextType: 'anon_session' | 'friendship';
  contextId: string;
  sessionId?: string; // deprecated
  reason: 'hangup' | 'partner_left' | 'error';
}
