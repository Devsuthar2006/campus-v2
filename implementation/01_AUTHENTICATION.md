# Phase 01 — Authentication & Student Verification

> **Milestone:** Verified students can sign in; sessions and authorization are enforced everywhere.

## Objective
Implement the identity foundation: Google OAuth sign-in, institutional-email verification, JWT access + refresh tokens, session management, and role-based authorization. Every subsequent phase depends on a trustworthy, server-enforced identity. This is the trust gate of the entire platform.

## Features Included
- Google OAuth sign-in and institutional-domain verification.
- User + Google account creation; one verified account per email.
- JWT access tokens + rotating, revocable refresh tokens.
- Session validation on REST and Socket.IO; logout; token refresh.
- RBAC scaffolding (roles, account states) and account-state enforcement (banned/suspended rejected).
- Account deletion (initiate + grace window).

## Dependencies
- **Documentation:** `AUTH_SYSTEM.md` (all), `SECURITY.md` (§3, §10), `DATABASE_SCHEMA.md` §5 (Authentication module), `API_SPEC.md` §3, `SOCKET_EVENTS.md` §2, §14.
- **Phases:** 00 (setup, DB, server skeleton).

## Backend Tasks
- Implement the Google OAuth verification flow server-side (`AUTH_SYSTEM.md` §3): verify credential, validate institutional domain against `universities.email_domains`, find-or-create the user.
- Issue JWT access tokens (short TTL, identity + RBAC claims) and refresh tokens (hashed, rotated, revocable) per `AUTH_SYSTEM.md` §5.
- Implement auth middleware validating JWT on every protected REST request and the Socket.IO handshake (`SOCKET_EVENTS.md` §14).
- Implement RBAC checks in the service layer using the canonical role set (`student` … `super_admin`) and account-state gating (reject `banned`/`suspended`) per the resolved enums in `DATABASE_SCHEMA.md` §5.3.
- Implement logout (revoke refresh token, disconnect sockets) and account deletion (set `deactivated`, schedule PII purge).

## Frontend Tasks
- Build the Authentication screen (one-tap Google sign-in, calm/trustworthy layout — `UI_GUIDELINES.md` §12).
- Implement token storage (access in memory, refresh per `AUTH_SYSTEM.md` §5), silent refresh, and route guards.
- First-run handling: route `pending_verification` users to profile completion (Phase 02).
- Authenticated Socket.IO connection on login.

## Database Tasks
- Implement `DATABASE_SCHEMA.md` §5 tables: `universities`, `branches`, `users` (with resolved `role`/`account_status` enums), `google_accounts`, `refresh_tokens`, `login_history`, and `user_devices` (future-ready, minimal). Apply via Drizzle migrations.

## Socket Tasks
- Implement handshake authentication and `authenticate` / `authenticated` / `authentication_failed` events; bind the socket to the verified user; reject unauthenticated sockets (`SOCKET_EVENTS.md` §2, §14).

## UI Components
- Sign-in screen, loading/splash, route guards, and a minimal "verification failed / not a recognized campus" empty-error state (`UI_GUIDELINES.md` §16).

## Security Considerations
- Server-side validation of Google credentials, institutional-domain enforcement, refresh-token rotation/revocation, fail-closed authorization, login audit logging, no secrets client-side (`SECURITY.md` §3, §9, §10; `AUTH_SYSTEM.md` §10). Ensure CSRF protection on the cookie-based refresh endpoint (REVIEW_REPORT L-2).

## Acceptance Criteria
- A student with a recognized institutional email can sign in; a non-institutional email is rejected with clear messaging.
- Access tokens validate on REST and sockets; expired tokens refresh transparently; logout revokes the session.
- A banned/suspended account cannot authenticate.
- All auth events are recorded in `login_history`; the system fails closed on missing/invalid auth.

## Deliverables
- Working verified sign-in, session lifecycle, RBAC enforcement, and account deletion initiation — the identity layer for all later phases.

## Out of Scope
- Profile editing/avatars (Phase 02), MFA/passkeys/additional providers (future — `AUTH_SYSTEM.md` §12), any feature surface.

## Risks
- OAuth misconfiguration; institutional-domain edge cases (shared/multiple domains — REVIEW_REPORT edge cases); refresh-token theft handling. Mitigate with strict server verification and rotation.

## Future Improvements
- MFA for admins/moderators, passkeys, Campus SSO, trusted devices (`AUTH_SYSTEM.md` §12).
