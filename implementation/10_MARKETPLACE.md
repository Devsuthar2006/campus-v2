# Phase 10 — Marketplace & Lost & Found

> **Milestone:** Campus-scoped student commerce (listings) and a lost & found board are live.

## Objective
Implement the marketplace (listings, browse, favorites) and lost & found (lost/found items, claims) — concrete daily-utility surfaces that build habitual use. Both are campus-scoped and reuse media (Phase 06), chat for buyer-seller contact (Phases 04–05), and moderation hooks. Commerce is contact-to-transact; on-platform payments are out of scope (future).

## Features Included
- Marketplace: create/browse/update/delete listings, favorites, report listing.
- Lost & Found: report lost/found item, browse, claim with verification, mark resolved.
- Campus scoping; auto-expiry/archival of stale listings and resolved items.

## Dependencies
- **Documentation:** `PRODUCT_REQUIREMENTS.md` §8.12–8.13, `DATABASE_SCHEMA.md` §12–13, `FEATURE_MATRIX.md` §11–12, `API_SPEC.md` §10–11, `MEDIA_SYSTEM.md`, `FRIEND_SYSTEM.md` (DM contact).
- **Phases:** 00–06 (identity, media, chat for contact), 08 (notifications).

## Backend Tasks
- Implement marketplace services over `DATABASE_SCHEMA.md` §12: `marketplace_items`, `marketplace_categories`, `marketplace_favorites`, `item_media`.
- Implement lost & found over §13: `lost_found_items`, `lost_found_claims`.
- Money as integer minor units (`price_cents` + `currency`) — no payments processing (`DATABASE_SCHEMA.md` §12.4).
- Buyer-seller and claim contact via existing chat/DM (no bespoke messaging).
- Auto-expiry/archival jobs (Phase-00 worker); report wiring into Moderation (Phase 12).
- Endpoints: listings CRUD, favorites, report; lost & found report/browse/claim/resolve (`API_SPEC.md` §10–11).

## Frontend Tasks
- Marketplace browse (grid/list, filter/search), listing detail, create/edit listing, favorites, "contact seller" via chat.
- Lost & Found board (lost/found filter), report item, claim flow, mark-resolved.

## Database Tasks
- Implement `DATABASE_SCHEMA.md` §12–13 tables; browse indexes `(university_id, status, created_at desc)`; favorites composite PK; claim indexes.

## Socket Tasks
- None specific; buyer-seller and claim conversations use existing chat events (`SOCKET_EVENTS.md` §5). Notifications via Phase 08.

## UI Components
- Listing grid/cards (image-first), listing detail, create/edit forms, favorites, lost & found board + claim UI, empty/error states — per `UI_GUIDELINES.md`.

## Security Considerations
- Campus-scoped visibility; prohibited-item rules via moderation; reportable listings; claim verification before contact; in-person safety guidance (`SECURITY.md`; `PRODUCT_REQUIREMENTS.md` §8.12–8.13).

## Acceptance Criteria
- Students create/browse campus-scoped listings, favorite items, and contact sellers via chat.
- Lost/found items can be posted, claimed (with verification), and resolved; stale items auto-archive.
- All listings/items are reportable; prices stored as integer minor units.

## Deliverables
- Working marketplace + lost & found — daily-utility surfaces reinforcing habitual use.

## Out of Scope
- On-platform payments/transactions/invoices (future — `DATABASE_SCHEMA.md` §12.4), maps/photo-proof verification (future).

## Risks
- Prohibited-item abuse (relies on moderation); free-text quality. Mitigate with reporting + moderation.

## Future Improvements
- Payments, price-drop alerts, location/map, delivery options (future).
