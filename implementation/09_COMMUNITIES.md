# Phase 09 — Communities & Clubs

> **Milestone:** Students can create/join communities and clubs with their own feeds and roles.

## Objective
Implement communities (and clubs, a specialized community type): membership with roles, community feeds, invitations, and community moderation within platform rules. This marks the shift from a chat app to a campus platform, reusing wall content patterns and the messaging/notification infrastructure.

## Features Included
- Create/join/leave communities (open/request/invite visibility).
- Community feed (posts), membership roles (owner/moderator/member), invitations.
- Clubs as verified community type; community moderators.

## Dependencies
- **Documentation:** `PRODUCT_REQUIREMENTS.md` §8.9–8.11, `DATABASE_SCHEMA.md` §11 (Communities module), `FEATURE_MATRIX.md` §9, `API_SPEC.md` §9, `PUBLIC_WALL.md` (post patterns), `UI_GUIDELINES.md`.
- **Phases:** 00–08 (identity, wall patterns, notifications). Reactions reuse Phase 07 polymorphic table.

## Backend Tasks
- Implement community services over `DATABASE_SCHEMA.md` §11: `communities`, `community_members`, `community_posts`, `community_invites`.
- Implement membership + role-based permissions (owner/moderator/member) and join flows (open/request/invite).
- Implement community feed (mirrors wall post patterns, scoped by `community_id`); reactions via the polymorphic `reactions` table (`target_type='community_post'`).
- Wire community reports/moderation into the central Moderation module (consumed Phase 12); notifications for community activity (Phase 08).
- Endpoints: browse, detail, join, leave, feed, members, create (`API_SPEC.md` §9).

## Frontend Tasks
- Community discovery/browse, community detail (feed + members + join), create-community flow, role management UI for owners/moderators, community compose.

## Database Tasks
- Implement `DATABASE_SCHEMA.md` §11 tables; member uniqueness `(community_id, user_id)`; role partial indexes; community feed index.

## Socket Tasks
- Community feed updates reuse wall-style fan-out to a community room (`SOCKET_EVENTS.md` §9 pattern); reserved live-community events are future.

## UI Components
- Community list/cards, community detail, member list, role badges, join/request buttons, community feed + compose, empty/error states — per `UI_GUIDELINES.md`.

## Security Considerations
- Role-based community authorization server-side; community moderators act within platform-wide rules with platform override; campus scoping where applicable; reportable content (`SECURITY.md`; `PUBLIC_WALL.md` §8 moderation model).

## Acceptance Criteria
- Students create and join communities; roles gate community actions; feeds are scoped and performant.
- Clubs function as verified communities with announcements; community content is reportable.

## Deliverables
- Communities + clubs with feeds, roles, and invitations — the platform layer beyond 1:1 and the global wall.

## Out of Scope
- Community events (Phase 11 wires event ownership), verified-club tooling/creator economy (future), live communities (future).

## Risks
- Permission-model complexity across scoped roles; feed performance per community. Mitigate by reusing wall patterns and indexes.

## Future Improvements
- Custom roles, paid/premium communities, live community sessions (`DATABASE_SCHEMA.md` §11 future).
