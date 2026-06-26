# Campusly V2 — REST API Specification

> **Document type:** REST API contract — official reference
> **Product:** Campusly V2 (formerly PU Chat)
> **Status:** Authoritative v1.0
> **Authority:** This is the definitive REST API specification. Frontend, backend, mobile, and AI assistants MUST conform. It defines endpoints, methods, request/response shapes, errors, and conventions — no implementation code, Express routes, or SQL.
> **Companion documents:** `AUTH_SYSTEM.md`, `MATCHING_ENGINE.md`, `FRIEND_SYSTEM.md`, `PUBLIC_WALL.md`, `MEDIA_SYSTEM.md`, `NOTIFICATION_SYSTEM.md`, `ADMIN_PANEL.md`, `SECURITY.md`, `SOCKET_EVENTS.md` (realtime), `CODING_STANDARDS.md`

> **Separation of concerns.** REST handles **resource management and business operations** (CRUD, state changes). Socket.IO handles **real-time push** (messages, presence, matching, notifications). Both share the same service layer and auth model.

---

## 1. API Philosophy

- **RESTful.** Resources are nouns; HTTP methods express intent (GET read, POST create, PATCH update, DELETE remove).
- **Versioned.** All endpoints live under `/api/v1/`; versions never break existing clients (§18).
- **Consistent.** Uniform request/response shapes, error envelope, pagination, and naming across all modules.
- **Stateless.** Each request carries its own auth (JWT); no server-side session state is needed for REST.
- **Separation from Socket.IO.** REST creates/updates/deletes resources; Socket.IO pushes real-time events. A message is *sent* over a socket but its *history* is fetched via REST.
- **Future compatible.** New endpoints are additive; existing ones evolve via expansion, never breaking removal.

---

## 2. API Standards

### 2.1 Base URL & versioning

```
https://api.campusly.in/api/v1/
```

All endpoints are prefixed with `/api/v1/`. Version bumps (v2, v3) are introduced only for breaking changes, which follow the deprecation policy (§18).

### 2.2 HTTP methods

| Method | Meaning |
|--------|---------|
| `GET` | Read / list a resource (safe, idempotent) |
| `POST` | Create a resource or trigger an action |
| `PATCH` | Partially update a resource |
| `DELETE` | Remove/soft-delete a resource |

### 2.3 Response envelope

Every response uses a consistent envelope:

**Success:**
```json
{
  "data": { ... },
  "meta": { "cursor": "...", "hasMore": true }
}
```

**Error:**
```json
{
  "error": {
    "code": "validation_error",
    "message": "Human-readable message",
    "details": [ ... ]
  }
}
```

### 2.4 Pagination

Cursor-based for feeds and lists:
- Query: `?cursor=<opaque>&limit=<n>`
- Response `meta`: `{ cursor, hasMore }`
- Default limit: 20; max: 100.

### 2.5 Filtering, sorting, search

- Filter: `?status=active&category=academics`
- Sort: `?sort=created_at:desc`
- Search: `?q=<term>` (full-text where supported)

---

## 3. Authentication APIs

*Full flow in `AUTH_SYSTEM.md`. Endpoints below.*

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/auth/google` | No | Exchange Google credential for access + refresh tokens |
| `POST` | `/auth/refresh` | Refresh token | Issue new access token (rotate refresh) |
| `POST` | `/auth/logout` | Yes | Revoke refresh token; end session |
| `GET` | `/auth/me` | Yes | Current authenticated user |
| `DELETE` | `/auth/account` | Yes | Initiate account deletion (grace period) |

**Common errors:** `unauthorized`, `validation_error`, `forbidden` (banned).

---

## 4. User & Profile APIs

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/users/me/profile` | Yes | Get own full profile |
| `PATCH` | `/users/me/profile` | Yes | Update editable fields (name, bio, gender) |
| `POST` | `/users/me/avatar` | Yes | Request signed upload URL for avatar |
| `PATCH` | `/users/me/interests` | Yes | Update interest tags |
| `PATCH` | `/users/me/privacy` | Yes | Update privacy settings |
| `GET` | `/users/:id` | Yes | Get another user's public profile (visibility-gated) |
| `GET` | `/users/search` | Yes | Search users (name, campus) |

---

## 5. Anonymous Matching APIs

*Live matching flows through Socket.IO (`SOCKET_EVENTS.md` §4). REST provides supporting operations.*

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/matching/status` | Yes | Current queue/session state (for reconnection) |
| `POST` | `/matching/report` | Yes | Report a match partner (after/during session) |
| `GET` | `/matching/history` | Yes | Past match summary (paginated) |

**Note.** Join queue, leave queue, match found, and session messaging are **Socket.IO-only** — they require realtime delivery. REST is used for status reconciliation and post-session actions.

---

## 6. Friend System APIs

*Full behavior in `FRIEND_SYSTEM.md`.*

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/friends/requests` | Yes | Send a friend request |
| `GET` | `/friends/requests/incoming` | Yes | List pending incoming requests |
| `GET` | `/friends/requests/outgoing` | Yes | List pending outgoing requests |
| `POST` | `/friends/requests/:id/accept` | Yes | Accept a request |
| `POST` | `/friends/requests/:id/reject` | Yes | Reject a request |
| `DELETE` | `/friends/requests/:id` | Yes | Cancel an outgoing request |
| `GET` | `/friends` | Yes | List friends (paginated) |
| `DELETE` | `/friends/:id` | Yes | Remove a friend |
| `POST` | `/friends/block` | Yes | Block a user |
| `DELETE` | `/friends/block/:userId` | Yes | Unblock a user |
| `GET` | `/friends/blocked` | Yes | List blocked users |

---

## 7. Campus Wall APIs

*Full behavior in `PUBLIC_WALL.md`.*

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/wall/posts` | Yes | Create a post (named or anonymous) |
| `GET` | `/wall/posts` | Yes | Get campus feed (paginated, filterable, sortable) |
| `GET` | `/wall/posts/:id` | Yes | Get a single post with replies |
| `PATCH` | `/wall/posts/:id` | Yes | Edit own post |
| `DELETE` | `/wall/posts/:id` | Yes | Delete own post (soft) |
| `POST` | `/wall/posts/:id/replies` | Yes | Reply to a post |
| `DELETE` | `/wall/replies/:id` | Yes | Delete own reply |
| `POST` | `/wall/posts/:id/react` | Yes | Add/change reaction |
| `DELETE` | `/wall/posts/:id/react` | Yes | Remove reaction |
| `POST` | `/wall/posts/:id/bookmark` | Yes | Bookmark a post |
| `DELETE` | `/wall/posts/:id/bookmark` | Yes | Remove bookmark |
| `GET` | `/wall/bookmarks` | Yes | List bookmarks (paginated) |
| `POST` | `/wall/posts/:id/report` | Yes | Report a post/reply |
| `GET` | `/wall/posts/search` | Yes | Search posts |
| `GET` | `/wall/trending` | Yes | Get trending posts |
| `GET` | `/wall/categories` | Yes | List categories |

---

## 8. Media APIs

*Full behavior in `MEDIA_SYSTEM.md`. Bytes never transit the API — only signed URLs.*

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/media/upload-url` | Yes | Request a signed upload URL (type, size, duration validated) |
| `POST` | `/media/:id/confirm` | Yes | Confirm upload completed; activate media |
| `DELETE` | `/media/:id` | Yes | Delete own media |
| `GET` | `/media/:id/url` | Yes | Get a signed download URL (access-checked) |

**Upload flow.** `POST /media/upload-url` → upload bytes directly to object storage → `POST /media/:id/confirm` → media is active and linkable. Validation (type/size/duration/limits) occurs at URL-request time. Temporary media auto-expires per `MEDIA_SYSTEM.md` §5.

---

## 9. Community APIs

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/communities` | Yes | Browse/search communities (paginated) |
| `GET` | `/communities/:id` | Yes | Community detail |
| `POST` | `/communities/:id/join` | Yes | Join (or request to join) |
| `POST` | `/communities/:id/leave` | Yes | Leave a community |
| `GET` | `/communities/:id/feed` | Yes | Community post feed (paginated) |
| `GET` | `/communities/:id/members` | Yes | Member list |
| `POST` | `/communities` | Yes | Create a community |

---

## 10. Marketplace APIs

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/marketplace/listings` | Yes | Create a listing |
| `GET` | `/marketplace/listings` | Yes | Browse/filter listings (paginated) |
| `GET` | `/marketplace/listings/:id` | Yes | Listing detail |
| `PATCH` | `/marketplace/listings/:id` | Yes | Update own listing |
| `DELETE` | `/marketplace/listings/:id` | Yes | Remove own listing |
| `POST` | `/marketplace/listings/:id/report` | Yes | Report a listing |
| `POST` | `/marketplace/listings/:id/favorite` | Yes | Save a listing |
| `DELETE` | `/marketplace/listings/:id/favorite` | Yes | Remove saved |
| `GET` | `/marketplace/favorites` | Yes | List saved listings |

---

## 11. Lost & Found APIs

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/lost-found` | Yes | Report a lost or found item |
| `GET` | `/lost-found` | Yes | Browse items (paginated, filterable by kind/status) |
| `GET` | `/lost-found/:id` | Yes | Item detail |
| `POST` | `/lost-found/:id/claim` | Yes | Submit a claim |
| `PATCH` | `/lost-found/:id/resolve` | Yes | Mark resolved (owner only) |

---

## 12. Events APIs

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/events` | Yes | Browse upcoming events (paginated) |
| `GET` | `/events/:id` | Yes | Event detail |
| `POST` | `/events` | Yes | Create an event |
| `POST` | `/events/:id/rsvp` | Yes | RSVP (going/interested) |
| `DELETE` | `/events/:id/rsvp` | Yes | Cancel RSVP |

---

## 13. Notification APIs

*Full behavior in `NOTIFICATION_SYSTEM.md`. Real-time delivery is Socket.IO; REST provides history and management.*

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/notifications` | Yes | Get notifications (paginated, unread-first) |
| `PATCH` | `/notifications/:id/read` | Yes | Mark one notification read |
| `POST` | `/notifications/read-all` | Yes | Mark all read |
| `DELETE` | `/notifications/:id` | Yes | Dismiss a notification |
| `GET` | `/notifications/preferences` | Yes | Get notification preferences |
| `PATCH` | `/notifications/preferences` | Yes | Update preferences |

---

## 14. Subscription APIs

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/subscriptions/plans` | Yes | List available plans |
| `POST` | `/subscriptions/purchase` | Yes | Initiate subscription purchase |
| `POST` | `/subscriptions/verify` | Yes | Verify payment completion |
| `GET` | `/subscriptions/current` | Yes | Current subscription status |
| `POST` | `/subscriptions/cancel` | Yes | Cancel subscription |
| `GET` | `/subscriptions/trial` | Yes | Free trial status |

---

## 15. Admin APIs

*Full behavior in `ADMIN_PANEL.md`. All endpoints require Moderator or Admin role (`AUTH_SYSTEM.md` §7).*

| Method | Endpoint | Auth/Role | Purpose |
|--------|----------|-----------|---------|
| `GET` | `/admin/dashboard` | Admin | Dashboard metrics |
| `GET` | `/admin/users` | Admin | User list (searchable, filterable) |
| `GET` | `/admin/users/:id` | Admin | User detail + history |
| `PATCH` | `/admin/users/:id/status` | Admin | Suspend/ban/restore |
| `GET` | `/admin/reports` | Moderator | Report queue (paginated) |
| `PATCH` | `/admin/reports/:id` | Moderator | Resolve/dismiss a report |
| `POST` | `/admin/moderation/actions` | Moderator | Apply moderation action (warn/restrict/ban) |
| `GET` | `/admin/moderation/appeals` | Moderator | Appeal queue |
| `POST` | `/admin/announcements` | Admin | Create announcement |
| `GET` | `/admin/analytics` | Admin | Analytics data |
| `GET` | `/admin/feature-flags` | Admin | List feature flags |
| `PATCH` | `/admin/feature-flags/:key` | Admin | Toggle a feature flag |
| `PATCH` | `/admin/subscriptions/:userId` | Admin | Grant/revoke subscription |
| `GET` | `/admin/audit-logs` | Admin | Audit log (paginated) |

---

## 16. API Security

*Full model in `SECURITY.md`. Summary of API-specific enforcement:*

| Control | Behavior |
|---------|----------|
| **JWT Authentication** | Every protected endpoint validates the access token (signature, expiry, claims) |
| **Authorization** | Role + scope checked in the service layer; Admin endpoints reject non-admin tokens |
| **Rate Limiting** | Per-user/per-endpoint limits enforced; exceeds return `429 Too Many Requests` with `retryAfter` |
| **Input Validation** | Zod validates every request body/param at the boundary before services |
| **File Validation** | Media upload-URL requests validate type, size, duration |
| **Secure Headers** | CORS, content-type, strict-transport-security, X-Content-Type-Options |
| **Request Limits** | Body size caps prevent payload abuse |

---

## 17. Error Handling

A standard error catalogue used uniformly across all endpoints.

| HTTP Code | Error code | Meaning |
|-----------|-----------|---------|
| `400` | `validation_error` | Request failed validation (bad shape, missing fields, invalid values) |
| `401` | `authentication_failed` | Missing or invalid token |
| `401` | `unauthorized` | Token expired or revoked |
| `403` | `forbidden` | Authenticated but insufficient role/permission |
| `404` | `not_found` | Resource does not exist or is not visible to requester |
| `409` | `conflict` | State conflict (duplicate, already exists, invalid transition) |
| `429` | `too_many_requests` | Rate limit exceeded; `retryAfter` in details |
| `500` | `server_error` | Unexpected failure (no internals exposed) |

**Error response structure** (repeated from §2.3 for clarity):
```json
{
  "error": {
    "code": "validation_error",
    "message": "Name is required and must be at most 100 characters.",
    "details": [
      { "field": "name", "issue": "required" }
    ]
  }
}
```

**Rules.** Errors never expose stack traces, SQL, or secrets. Messages are student-friendly. `details` is optional and present only when actionable (e.g., per-field validation).

---

## 18. API Versioning Strategy

| Rule | Behavior |
|------|----------|
| **Current version** | `v1` — all endpoints under `/api/v1/` |
| **Backward compatibility** | New fields/endpoints are additive; existing fields/behavior are not removed or changed in meaning within a version |
| **Deprecation policy** | Before removing/breaking an endpoint: deprecation notice → migration window → removal in the next version |
| **Future versions** | A `v2` is introduced only when a breaking change is unavoidable; both versions may coexist during migration |

The guiding rule: **never break existing clients.** Expand (add fields, endpoints, optional params) within a version; break only across version boundaries with notice.

---

## 19. Performance Guidelines

| Guideline | Behavior |
|-----------|----------|
| **Cursor pagination** | All list endpoints are cursor-paginated (no offset) for stable, efficient feeds |
| **Response size** | Return only necessary fields; no unbounded arrays; paginate everything |
| **Compression** | Responses are gzip/brotli-compressed at the Nginx layer |
| **Caching strategy** | HTTP cache headers for cacheable resources (categories, plans); real-time data served fresh |
| **Efficient querying** | Endpoints backed by indexed, bounded queries; maintained counters over live `COUNT(*)` |

---

## 20. API Design Principles

The non-negotiable design principles governing all endpoints.

| Principle | Meaning |
|-----------|---------|
| **Consistency** | Same patterns, naming, envelope, and errors everywhere |
| **Predictability** | An engineer who knows one endpoint can predict the shape of any other |
| **Small responses** | Return what the client needs, nothing more |
| **Security first** | Auth, validation, and rate limiting on every endpoint by default |
| **Mobile first** | Lean payloads, efficient pagination, fast response times |
| **Documentation first** | An endpoint is documented here before it is built |
| **Version everything** | Under `/api/v1/`; expansions within, breaks across versions |
| **Never break existing clients** | Additive changes only within a version |

---

## Closing Note

This document is the official REST API specification for Campusly V2. It defines the contract between frontend and backend — endpoints, methods, shapes, errors, and conventions — ensuring **consistency, predictability, security, and mobile-friendliness** across the entire platform.

It complements (and never duplicates) the real-time contract (`SOCKET_EVENTS.md`), business behavior (feature documents), data model (`DATABASE_SCHEMA.md`), and security model (`SECURITY.md`). Where API behavior is unclear, this document decides; where product behavior is unclear, the feature spec decides. No endpoint ships without being documented here first; no breaking change ships without following the versioning policy.

*— Principal Backend Architect, API Designer, Staff Software Engineer & Technical Lead, Campusly V2*
