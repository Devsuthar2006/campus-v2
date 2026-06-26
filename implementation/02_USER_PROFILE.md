# Phase 02 — User Profile & Privacy

> **Milestone:** Verified students have a complete, controllable identity with privacy settings.

## Objective
Build the student profile on top of verified identity: editable fields, interests, privacy settings, and presence/last-seen controls. Profile completion transitions an account from `pending_verification` to `active`, unlocking the rest of the product. Avatar upload is stubbed here and fully wired in Phase 06 (Media).

## Features Included
- Profile view/edit (name, bio, gender), with verified fields (university, branch, year) shown distinctly.
- Interests (tags) management.
- Privacy settings (visibility, presence, read receipts, friend-request permissions).
- Online status / last-seen controls.
- Profile-completion gate (`pending_verification → active`).

## Dependencies
- **Documentation:** `PRODUCT_REQUIREMENTS.md` §8.2, `AUTH_SYSTEM.md` §2, §8, §9, `DATABASE_SCHEMA.md` §6 (Profile module), `API_SPEC.md` §4, `UI_GUIDELINES.md` §12.
- **Phases:** 00, 01 (identity must exist).

## Backend Tasks
- Implement profile services and repositories over `DATABASE_SCHEMA.md` §6 (`profiles`, `user_interests`, `interests`, `privacy_settings`).
- Implement profile read/update endpoints (`API_SPEC.md` §4) with Zod validation and content limits; moderation hooks on bio/avatar are reserved for Phase 12.
- Implement the profile-completion transition to `active`.
- Implement privacy-setting enforcement helpers used by presence, friend requests, and visibility checks downstream.

## Frontend Tasks
- Profile screen (view/edit) and Settings screen (privacy, notification prefs placeholder).
- First-run profile completion flow (post sign-in for new users).
- Forms via React Hook Form + Zod; optimistic updates via React Query.
- Avatar UI present but upload disabled/stubbed until Phase 06.

## Database Tasks
- Implement `DATABASE_SCHEMA.md` §6 tables with privacy-friendly defaults at creation. `avatar_media_id` FK references `media_assets` (table created in Phase 06; nullable until then).

## Socket Tasks
- None required this phase. Presence event scaffolding (`user_online`/`offline`, `presence_update`) is defined here but activated with chat in Phase 04 (`SOCKET_EVENTS.md` §3).

## UI Components
- Profile view/edit, Settings list, avatar placeholder, interest selector, privacy toggles — all per `UI_GUIDELINES.md` (minimal, premium, accessible). Empty states for incomplete profile.

## Security Considerations
- Visibility enforced server-side (never client-trusted); anonymous interactions must never expose profile identity (`AUTH_SYSTEM.md` §9, `SECURITY.md` §8). Validate and length-limit all profile inputs.

## Acceptance Criteria
- A new user completes their profile and the account becomes `active`.
- Users can edit allowed fields and control privacy settings; verified fields are not freely editable.
- Profile visibility and presence respect privacy settings server-side.

## Deliverables
- Complete profile + privacy system; the identity that friendships, the wall, and discovery build on.

## Out of Scope
- Avatar/media upload (Phase 06), friend visibility behavior (Phase 05), notifications delivery (Phase 08), moderation of profile content (Phase 12).

## Risks
- Privacy-setting enforcement gaps if added late to downstream features. Mitigate by centralizing visibility checks now.

## Future Improvements
- Headline, social links, pronouns, verified-creator badges (`DATABASE_SCHEMA.md` §6.1 future).
