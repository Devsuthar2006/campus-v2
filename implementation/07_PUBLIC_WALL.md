# Phase 07 — Campus Wall

> **Milestone:** The campus-scoped public square — posts, replies, reactions, polls — is live.

## Objective
Implement the Campus Wall, the primary daily-engagement surface: campus-scoped posts (named or anonymous), replies, reactions, bookmarks, categories, search, and trending. This is the first one-to-many surface and depends on identity, profiles, and media. Moderation hooks are wired here; the moderation tooling itself lands in Phase 12.

## Features Included
- Create post (named/anonymous), reply, react, bookmark; polls and announcements.
- Categories and tags; wall search; trending (materialized).
- Campus-scoped feed with cursor pagination; report content.

## Dependencies
- **Documentation:** `PUBLIC_WALL.md` (all), `DATABASE_SCHEMA.md` §10 (Wall module), `SOCKET_EVENTS.md` §9, `API_SPEC.md` §7, `UI_GUIDELINES.md` §12, `MEDIA_SYSTEM.md` (post media).
- **Phases:** 00–02, 06 (media for image posts). Reactions/reports use the polymorphic pattern (REVIEW_REPORT M-1).

## Backend Tasks
- Implement wall services over `DATABASE_SCHEMA.md` §10: `wall_posts`, `wall_replies`, `reactions` (polymorphic), `bookmarks`, `wall_categories`, `tags`/`post_tags`, `trending_posts`, `post_media`.
- Implement post/reply/reaction/bookmark endpoints (`API_SPEC.md` §7) with validation, rate limits, campus scoping (`university_id`), and maintained counters.
- Anonymous posts: display anonymized, always retain `author_id` (accountability).
- Implement wall search (Postgres FTS) and the trending materialization background job (`PUBLIC_WALL.md` §5, §10.8).
- Wire report creation into the moderation module (queue consumed in Phase 12).

## Frontend Tasks
- Campus Wall feed (infinite scroll, latest/trending toggle, category filter), compose (named/anonymous, poll, media), post detail with replies and reactions, bookmarks list, search.

## Database Tasks
- Implement `DATABASE_SCHEMA.md` §10 tables; composite feed index `(university_id, created_at desc) WHERE visible`; reaction uniqueness `(user_id, target_type, target_id)`.

## Socket Tasks
- Implement `new_post`, `new_reply`, `new_reaction`, `post_deleted`, `announcement_created` to the campus room (`SOCKET_EVENTS.md` §9). Creation is REST; fan-out is realtime.

## UI Components
- Feed, post card, compose sheet, poll UI, reaction bar, reply thread, category chips, search bar, trending view, bookmarks, empty/error states — per `UI_GUIDELINES.md` §12, §16. Healthy-engagement principles (no follower counts).

## Security Considerations
- Accountable anonymity (author always retained, moderator-only); campus scoping enforced server-side; rate limits; reportable content; no unmoderated surface (moderation hooks now, tooling Phase 12) (`SECURITY.md` §6, §8; `PUBLIC_WALL.md` §7–8).

## Acceptance Criteria
- Students post (named/anonymous), reply, react, bookmark; the campus-scoped feed loads fast via cursors and maintained counters.
- Polls and announcements work; trending is materialized, not computed per request.
- All content is reportable; anonymous content retains internal authorship.

## Deliverables
- A live, campus-scoped Campus Wall — the daily-habit surface.

## Out of Scope
- Moderation dashboard/actions (Phase 12), communities feed (Phase 09), AI summaries/recommendations, verified club/college posts (future — `PUBLIC_WALL.md` §10).

## Risks
- Orphaned polymorphic reactions/reports (M-1 — rely on cleanup + counter reconciliation); feed performance at scale (mitigated by indexes + materialized trending).

## Future Improvements
- Trending topics, campus highlights, pinned/verified posts, recommendations (`PUBLIC_WALL.md` §10).
