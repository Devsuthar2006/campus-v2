# Phase 11 — Events

> **Milestone:** Campus and community events with RSVPs and reminders are live.

## Objective
Implement events: creation (by students, clubs, communities), RSVP/interested with capacity and waitlist, event discovery, and reminders. Events reuse communities (Phase 09), notifications (Phase 08), and media (Phase 06 for banners). They give clubs and the campus a recurring reason to return.

## Features Included
- Create event (title, time, location, capacity); event categories and banners.
- RSVP (going/interested), waitlist on capacity, cancel RSVP.
- Event discovery (upcoming feed), event detail, reminders (scheduled notifications).

## Dependencies
- **Documentation:** `PRODUCT_REQUIREMENTS.md` §8.11, `DATABASE_SCHEMA.md` §14 (Events module), `FEATURE_MATRIX.md` §10, `API_SPEC.md` §12, `NOTIFICATION_SYSTEM.md` (reminders), `MEDIA_SYSTEM.md` (banners).
- **Phases:** 00–09 (identity, communities, notifications, media).

## Backend Tasks
- Implement event services over `DATABASE_SCHEMA.md` §14: `events`, `event_attendees`, `event_categories`.
- Implement RSVP with transactional capacity enforcement + waitlist (`DATABASE_SCHEMA.md` §14.2).
- Implement event ownership (organizer; community-owned events via Phase 09 roles).
- Implement reminders as scheduled notifications (Phase 08 + Phase-00 worker) — not a separate table (`DATABASE_SCHEMA.md` §14.4).
- Endpoints: browse, detail, create, RSVP, cancel RSVP (`API_SPEC.md` §12).

## Frontend Tasks
- Events list (date-sorted, upcoming), event detail with RSVP button and attendee count, create-event flow, RSVP/interested controls, reminders surfaced via notifications.

## Database Tasks
- Implement `DATABASE_SCHEMA.md` §14 tables; index `(university_id, starts_at)`; attendee uniqueness `(event_id, user_id)`; "going" partial index for capacity.

## Socket Tasks
- None specific; reminders and RSVP confirmations flow via the notification system (Phase 08). Reserved live-event events are future.

## UI Components
- Event cards (date-forward), event detail, RSVP button, capacity/waitlist indicator, create-event form, banner upload, empty/error states — per `UI_GUIDELINES.md`.

## Security Considerations
- Authorization for event creation (students/club admins per role); capacity enforced transactionally; reportable events; campus scoping (`SECURITY.md`; `PRODUCT_REQUIREMENTS.md` §8.11).

## Acceptance Criteria
- Students/clubs create events; others RSVP; capacity and waitlist are enforced atomically.
- Reminders are delivered before events via notifications; events are campus/community-scoped and discoverable.

## Deliverables
- Working events module with RSVPs and reminders — recurring campus utility built on communities + notifications.

## Out of Scope
- Ticketing, check-in/QR, recurring events, online/voice-room events (future — `DATABASE_SCHEMA.md` §14.1 future).

## Risks
- Capacity race conditions (mitigated by transactional RSVP); reminder timing accuracy (worker cadence).

## Future Improvements
- Ticketing, check-in, recurring/hybrid events, voice-room integration (future).
