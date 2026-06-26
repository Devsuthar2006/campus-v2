# Phase 03 — Anonymous Matching Engine

> **Milestone:** Verified students can be paired into anonymous sessions, server-authoritatively.

## Objective
Implement the signature acquisition feature: server-authoritative anonymous matching with an in-memory-hot / DB-durable queue, transactional session creation, heartbeat cleanup, and recovery. This phase delivers pairing and session lifecycle; the in-session conversation itself is delivered in Phase 04 (Chat), which this phase depends on closely but precedes by establishing the session container.

## Features Included
- Join/leave queue, server-side pairing, match found, session start/end.
- Heartbeat liveness + stale-user cleanup; crash recovery from persisted queue/session state.
- Campus-scoped pairing (`university_id`), no self-match, block/recent-match exclusions.
- Report-from-session and matching status (for reconnection).

## Dependencies
- **Documentation:** `MATCHING_ENGINE.md` (all), `ARCHITECTURE.md` §5, `SOCKET_EVENTS.md` §4, `DATABASE_SCHEMA.md` §7 (Matching module), `API_SPEC.md` §5.
- **Phases:** 00, 01, 02 (verified, active, profiled users).

## Backend Tasks
- Implement the matching service as **sole authority** (`ARCHITECTURE.md` §5): in-memory waiting pool + persisted `match_queue` for recovery.
- Implement transactional pairing + session creation (atomic queue-clear) per `MATCHING_ENGINE.md` §5–6 and `DATABASE_SCHEMA.md` §7.
- Implement heartbeat tracking and stale reclamation; the cleanup background job for abandoned sessions/queue entries (`MATCHING_ENGINE.md` §5.2, §9; cron via Phase-00 worker seam).
- Implement exclusions: campus scope, self-match, block list (block table arrives in Phase 05 — gate defensively), recent-match de-prioritization via `match_history`.
- Implement `GET /matching/status`, `POST /matching/report`, `GET /matching/history` (`API_SPEC.md` §5).

## Frontend Tasks
- "Find Someone" screen with queue/status feedback and the matching animation (`UI_GUIDELINES.md` §13, single delight moment).
- Session screen shell (anonymous, no profiles) ready to host chat from Phase 04.
- Reconnection handling using `/matching/status`.

## Database Tasks
- Implement `DATABASE_SCHEMA.md` §7: `match_queue`, `anon_sessions`, `session_participants`, `match_history`. Apply partial indexes for waiting/active rows.

## Socket Tasks
- Implement `join_queue`, `leave_queue`, `queue_status`, `match_found`, `match_cancelled`, `match_timeout`, `session_started`, `session_ended` and the heartbeat (`SOCKET_EVENTS.md` §4). Server is authoritative; no client queue scanning.

## UI Components
- Find/matching screen, queue status indicator, session shell, leave/skip controls, report action — per `UI_GUIDELINES.md`.

## Security Considerations
- Reportability with verified-author recovery for moderators (accountable anonymity); rate-limit join/skip/rejoin; never reveal identity in session (`SECURITY.md` §6, §8; `MATCHING_ENGINE.md` §7).

## Acceptance Criteria
- Two waiting users on the same campus are paired sub-3s median with no duplicate/ghost sessions (transactional).
- Disconnects are reclaimed via heartbeat; a server restart recovers consistent state.
- Self-match and recent-match are prevented; reports capture verified identity for moderators.

## Deliverables
- Working anonymous matching + session lifecycle, recoverable and abuse-resistant — the hook of the product.

## Out of Scope
- In-session messaging (Phase 04), friend transition (Phase 05), AI/interest-based matching, voice/video matching (future — `MATCHING_ENGINE.md` §11).

## Risks
- Race conditions if pairing isn't truly atomic; ghost users if heartbeat tuning is wrong. Mitigate with transactions and tested cleanup (the V1 failures this phase exists to prevent).

## Future Improvements
- Interest/branch/preference-weighted matching, premium priority, cross-campus mode (`MATCHING_ENGINE.md` §11).
