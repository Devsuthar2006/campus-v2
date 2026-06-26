# Phase 04 — Chat System (Messaging)

> **Milestone:** Real-time, persisted text messaging works for anonymous sessions (and is reusable for friend chats).

## Objective
Implement the unified messaging architecture that serves both anonymous sessions (Phase 03) and friend chats (Phase 05). This phase delivers text messaging, delivery/read state, typing indicators, and presence — text only; voice/media messages arrive in Phase 06. Messaging is the engagement core.

## Features Included
- Real-time text message send/receive (persist-then-broadcast).
- Delivery status and read receipts (high-water-mark), privacy-gated.
- Typing indicators (ephemeral) and presence/online status.
- Conversation history with cursor pagination.

## Dependencies
- **Documentation:** `ARCHITECTURE.md` §6, `SOCKET_EVENTS.md` §3, §5, `DATABASE_SCHEMA.md` §8 (Messaging module), `PRODUCT_REQUIREMENTS.md` §8.5, `UI_GUIDELINES.md` §12.
- **Phases:** 00, 01, 02, 03 (anonymous session container exists).

## Backend Tasks
- Implement the unified `messages` model with `context_type` (`anon_session` | `friendship`) per `DATABASE_SCHEMA.md` §8.1; enforce the "exactly one context FK" constraint.
- Implement the messaging service (transport-agnostic): authorize (participant/friend, not blocked), persist, broadcast (`ARCHITECTURE.md` §6.2).
- Implement read receipts via `message_receipts` high-water-mark; reconcile with `delivery_status` per the resolved model (REVIEW_REPORT M-2 — receipts authoritative for read).
- Implement message-history fetch (cursor pagination, `API_SPEC.md` §2.4) — REST for history, sockets for live.
- Note partition-ready PK `(created_at, id)` for `messages` (REVIEW_REPORT H-2).

## Frontend Tasks
- Chat view (message list, composer) reused for sessions and friend chats; sender/receiver styling per `UI_GUIDELINES.md`.
- Real-time updates wired to React Query cache via socket events; typing/presence indicators; read receipts respecting privacy.
- Infinite-scroll history (cursor).

## Database Tasks
- Implement `DATABASE_SCHEMA.md` §8: `messages`, `message_receipts` (and `message_attachments`/`media_assets` created in Phase 06; text-only now). Composite PK and conversation indexes.

## Socket Tasks
- Implement `send_message`, `receive_message`, `message_delivered`, `message_read`, `typing_start`, `typing_stop`, `message_deleted`; presence events `user_online`/`user_offline`/`presence_update`/`last_seen_update` (`SOCKET_EVENTS.md` §3, §5). Typing/presence ephemeral, never persisted.

## UI Components
- Conversation screen, message bubbles, composer, typing indicator, presence dot, read-receipt indicator, empty state ("Say hello") — per `UI_GUIDELINES.md` §12, §16.

## Security Considerations
- Authorize every message server-side (participants/friends only, block-aware); validate/rate-limit; transit + at-rest encryption; receipts/presence honor privacy settings (`SECURITY.md` §4, §6; `AUTH_SYSTEM.md` §9).

## Acceptance Criteria
- Messages deliver in real time (<200ms median server processing — `PRODUCT_REQUIREMENTS.md` §10.1), persist durably, and survive reconnects.
- Read receipts and typing work and respect privacy settings.
- History paginates efficiently via cursors; offline users see messages on next load.

## Deliverables
- Reusable real-time messaging powering anonymous sessions now and friend chats in Phase 05.

## Out of Scope
- Voice/temporary media messages (Phase 06), friend chat context (Phase 05 enables it), E2EE (future — `ARCHITECTURE.md` §6.9), threading/edits (future).

## Risks
- Dual read-state drift (mitigated per M-2 resolution); message-volume write load (mitigated by partition-ready design).

## Future Improvements
- Message edits, reply threading, future E2EE for friend chats.
