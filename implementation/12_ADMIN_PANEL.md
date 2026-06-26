# Phase 12 — Admin Panel & Moderation

> **Milestone:** Moderators and admins can keep the platform safe and operate it — the report queues from earlier phases are now actionable.

## Objective
Implement the administrative platform: the moderation queue + actions (consuming the report hooks wired throughout Phases 03–11), user management, the dashboard, announcements, feature flags, analytics, and audit logging. This makes accountable anonymity enforceable. Per the vision, safety tooling is foundational; report *creation* shipped with each surface, and this phase delivers the *review and action* tooling.

## Features Included
- Moderation: report queue, review, warn/restrict/suspend/ban, appeals, moderator notes.
- User management (search, suspend, ban, restore, delete, history).
- Dashboard metrics; announcements; feature flags; analytics; audit logs.

## Dependencies
- **Documentation:** `ADMIN_PANEL.md` (all), `DATABASE_SCHEMA.md` §15 (Moderation), §18 (Analytics), §19 (System), `API_SPEC.md` §15, `AUTH_SYSTEM.md` §4, §7, `SECURITY.md`.
- **Phases:** 00–11 (content/reports to moderate; events to analyze). RBAC from Phase 01.

## Backend Tasks
- Implement moderation services over `DATABASE_SCHEMA.md` §15: `reports`, `moderation_actions`, `user_warnings`, `user_bans`, `moderation_appeals`, `audit_logs` (immutable, written transactionally with actions).
- Implement graduated enforcement (warn → restrict → suspend → ban) using the canonical `account_status` states; auto-lift expired temporary bans (worker).
- Implement user management actions (force logout/session revoke on ban/suspend — Phase 01 hooks).
- Implement dashboard metrics from analytics aggregates (`DATABASE_SCHEMA.md` §18), announcements (§19.4), feature flags (§19.2, incl. global subscription-requirement toggle), and audit-log views.
- Endpoints: dashboard, users, reports, moderation actions, appeals, announcements, analytics, feature-flags, subscription grant/revoke, audit logs (`API_SPEC.md` §15) — all RBAC-gated (Moderator/Admin/Super Admin).

## Frontend Tasks
- Admin dashboard (metrics, pending-reports prominence), report queue + review/action UI, user management, announcements composer, feature-flag toggles, analytics views, audit-log browser — separate, role-gated admin navigation (`UI_GUIDELINES.md` §11).

## Database Tasks
- Implement `DATABASE_SCHEMA.md` §15, §18, §19 tables; moderation-queue partial index; audit-log indexes; partition-ready `audit_logs`/`engagement_events` (H-2 note).

## Socket Tasks
- Implement `announcement_broadcast`, `user_suspended` (force teardown), `maintenance_mode`, `feature_toggle` (`SOCKET_EVENTS.md` §11) — RBAC-checked server-side; effects delivered live.

## UI Components
- Dashboard panels, report queue, action modals, user table + detail/history, announcement composer, feature-flag list, analytics charts, audit browser — per `UI_GUIDELINES.md`; admin sidebar nav.

## Security Considerations
- RBAC + scope on every action; immutable audit logging; session timeout for admins; IP logging; future two-person approval; anonymous-author resolution for moderators only (`SECURITY.md` §9, §13; `ADMIN_PANEL.md` §13). Decide media proactive-scanning posture (H-3).

## Acceptance Criteria
- Reports from all surfaces appear in the queue and can be actioned with graduated enforcement; every action is audit-logged.
- Bans/suspensions immediately revoke sessions; expired temporary bans auto-lift.
- Admins manage users, announcements, feature flags, and view analytics; all admin endpoints are role-gated.

## Deliverables
- Full admin + moderation platform making the entire product safe and operable.

## Out of Scope
- AI moderation/spam detection, Campus Admin portal, college verification dashboard, moderator-performance metrics (future — `ADMIN_PANEL.md` §14).

## Risks
- Moderation backlog/latency; privileged-action misuse (mitigated by RBAC + audit). Single-VM SPOF vs availability (H-4) affects ops.

## Future Improvements
- AI-assisted moderation, two-person approval, security dashboard (`ADMIN_PANEL.md` §14; `SECURITY.md` §12).
