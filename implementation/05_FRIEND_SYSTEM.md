# Phase 05 — Friend System

> **Milestone:** Anonymous matches and discovery convert into durable friendships with persistent chat.

## Objective
Implement the retention engine: friend requests, acceptance/rejection, removal, blocking, and persistent friend chat (reusing Phase 04 messaging via the `friendship` context). This closes the core loop — meet anonymously → befriend → stay — and introduces the platform-wide block control that earlier phases gated defensively.

## Features Included
- Send/accept/reject/cancel friend requests (from session, profile, community).
- Mutual-request auto-accept; rejection cooldown; rate limits.
- Friend list; remove friend; block/unblock (severs all contact).
- Persistent friend chat (text now; media in Phase 06).

## Dependencies
- **Documentation:** `FRIEND_SYSTEM.md` (all), `DATABASE_SCHEMA.md` §9 (Friend module), `SOCKET_EVENTS.md` §8, `API_SPEC.md` §6, `MATCHING_ENGINE.md` §8 (friend transition).
- **Phases:** 00–04 (identity, profile, matching session, messaging).

## Backend Tasks
- Implement friend services over `DATABASE_SCHEMA.md` §9: `friend_requests`, `friendships` (order-normalized `user_low < user_high`), `blocked_users`.
- Implement transactional acceptance (create friendship + close request) per `FRIEND_SYSTEM.md` §4; identity reveal only on mutual consent.
- Implement request rules: recipient `allow_friend_requests`, duplicate prevention, rejection cooldown, pending limits, rate limits (`FRIEND_SYSTEM.md` §3).
- Implement block enforcement across matching, requests, and chat (the control Phase 03/04 gated defensively).
- Enable the `friendship` messaging context (Phase 04) for friend chats.

## Frontend Tasks
- Friends list, incoming/outgoing requests, request actions, block/unblock UI.
- Friend chat using the Phase 04 conversation component (now with revealed identities).
- "Add friend" entry points from session, profile, and (later) community contexts.

## Database Tasks
- Implement `DATABASE_SCHEMA.md` §9 tables and indexes (friend lists from either side, incoming-request queues, reverse block lookups). Reserved close-friend flags remain unused (future).

## Socket Tasks
- Implement `friend_request_sent/received/accepted`, `friend_removed`, `user_blocked` (`SOCKET_EVENTS.md` §8) for real-time updates; friend chat uses Phase 04 chat events.

## UI Components
- Friends list, request cards, friend chat, block confirmation, empty states ("No friends yet — start a match") — per `UI_GUIDELINES.md` §12, §16.

## Security Considerations
- Block is comprehensive and server-enforced bidirectionally; requests respect privacy + cooldowns; friend visibility is consensual (`SECURITY.md` §8; `FRIEND_SYSTEM.md` §6–7). Reportable friend chats (Phase 12 moderation).

## Acceptance Criteria
- A match can become a friendship via mutual-consent acceptance; identities reveal only then.
- Friend chat persists independently of any ended session.
- Blocking removes the friendship and prevents all future contact/matching in both directions.

## Deliverables
- Complete friend system + persistent friend chat — the retention mechanism that completes the core loop.

## Out of Scope
- Friend media sharing (Phase 06), close/best friends, mutual-friends, AI suggestions (future — `FRIEND_SYSTEM.md` §10).

## Risks
- Symmetric-pair bugs (mitigated by order-normalization); block-enforcement gaps across surfaces (centralize checks).

## Future Improvements
- Close friends, shared albums, voice/video calls on friend chat (future).
