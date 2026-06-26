# Campusly V2 — Documentation Review Report

> **Reviewer role:** CTO (cross-document audit)
> **Scope:** All 19 documents in `/docs`
> **Date:** Initial audit, v1.0
> **Status:** Findings only. **No documentation has been modified.** Recommendations await approval before any change is made.
> **Update (post-approval):** C-1, C-2, and H-1 have been **applied** — see the ✅ RESOLVED markers below. All other findings remain open pending approval.
> **Method:** Full read of `PRODUCT_REQUIREMENTS`, `TECH_STACK`, `ARCHITECTURE`, `DATABASE_SCHEMA`, plus targeted cross-checks across all feature/spec docs (naming, enums, partitioning, polymorphic patterns, auth model, retention, rate limits).

## Summary

| Severity | Count | Theme |
|----------|-------|-------|
| Critical | 2 | Auth model contradictions (role & account-state enums) |
| High | 4 | Naming contradiction, DB partitioning constraint, media safety gap, availability vs SPOF |
| Medium | 6 | Data integrity, model ambiguity, missing decisions (payments/email/rate-limit store), governance |
| Low | 5 | Duplication drift, CSRF nuance, write amplification, ID generation, i18n |

Overall, the documentation set is unusually cohesive and cross-referenced. The issues below are real but mostly **reconcilable with small edits**; none require a structural rethink. The two Critical items are enum mismatches between `AUTH_SYSTEM.md`/`ADMIN_PANEL.md` and `DATABASE_SCHEMA.md` that *will* cause implementation bugs if not aligned before coding.

---

## CRITICAL

### C-1 — Account-state model mismatch between AUTH and DATABASE_SCHEMA
- **Severity:** Critical — ✅ **RESOLVED**
- **Resolution:** `users.account_status` enum updated in `DATABASE_SCHEMA.md` §5.3 to `pending_verification` / `active` / `restricted` / `suspended` / `banned` / `deactivated` (default `pending_verification`), with a cross-reference note aligning it to `AUTH_SYSTEM.md` §11.
- **Affected documents:** `AUTH_SYSTEM.md` §11, `DATABASE_SCHEMA.md` §5.3 (`users.account_status`), `ADMIN_PANEL.md` §4
- **Explanation:** `AUTH_SYSTEM.md` defines **six** account states — Pending Verification, Active, Temporarily Restricted, Suspended, Banned, Deleted. The `users.account_status` enum in `DATABASE_SCHEMA.md` defines only **four** — `active` / `restricted` / `banned` / `deactivated`. There is no `pending_verification` or `suspended` value, and `deactivated` ≠ `deleted`. `ADMIN_PANEL.md` §4 exposes a "Suspend User" action that has no corresponding state in the schema. This is a direct contradiction in a security-critical area (account lifecycle, ban enforcement). Implementers will not know which state machine is authoritative.
- **Recommended solution:** Reconcile to one canonical state set. Recommended enum: `pending_verification`, `active`, `restricted` (time-bound), `suspended` (under review), `banned`, `deactivated` (user soft-delete; hard PII purge handled via `deleted_at`). Update the `users.account_status` enum in `DATABASE_SCHEMA.md` to match `AUTH_SYSTEM.md` §11, and confirm the AUTH state diagram and the schema agree on transitions.

### C-2 — Role model mismatch (super_admin / premium as role vs subscription)
- **Severity:** Critical — ✅ **RESOLVED**
- **Resolution:** `super_admin` added to the `users.role` enum in `DATABASE_SCHEMA.md` §5.3, with a canonical role/state note. `AUTH_SYSTEM.md` §4.2 and §7 updated to state explicitly that "Premium Student" is a capability tier (`student` + `subscription_status='premium'`), not a `role` enum value.
- **Affected documents:** `AUTH_SYSTEM.md` §7, `ADMIN_PANEL.md` §2, `DATABASE_SCHEMA.md` §5.3 (`users.role`)
- **Explanation:** `AUTH_SYSTEM.md` §7 and `ADMIN_PANEL.md` §2 define roles including **Super Admin** and treat **Premium Student** as a role in the hierarchy. The `users.role` enum in `DATABASE_SCHEMA.md` is `student` / `community_moderator` / `club_admin` / `moderator` / `admin` — it has **no `super_admin`**, and premium status is (correctly) modeled separately as `subscription_status`, not a role. So: (a) `super_admin` is referenced by authorization docs but cannot be represented in the data model, and (b) "Premium Student" is described as a role in AUTH's hierarchy diagram while the schema models it as subscription state — an authorization-model conflict.
- **Recommended solution:** Add `super_admin` to the `users.role` enum in `DATABASE_SCHEMA.md`. In `AUTH_SYSTEM.md` §7, clarify that **Premium Student is not a role** but the combination of `role=student` + `subscription_status=premium` (entitlement, not privilege). Ensure `community_moderator` and `club_admin` (scoped roles, present in schema) are represented consistently in the AUTH role tables.

---

## HIGH

### H-1 — `campus_id` vs `university_id` naming contradiction (pervasive)
- **Severity:** High — ✅ **RESOLVED**
- **Resolution:** Standardized on **`university_id`** as the column name (concept remains "campus scoping"). Prose references to `campus_id` updated in `ARCHITECTURE.md` (§1.3, §7.1, §7.7, §12, §15, ADR-10), `TECH_STACK.md` (§4.3, §18), `MATCHING_ENGINE.md` §4, `PUBLIC_WALL.md` §5, and `DATABASE_SCHEMA.md` (§1.3, §1.11, §25). A naming note was added to `DATABASE_SCHEMA.md` §1.11 clarifying that any "campus_id" mention elsewhere means the `university_id` column. `CODING_STANDARDS.md` already used `university_id`.
- **Affected documents:** `ARCHITECTURE.md` (§1.3, §7.1, §7.7, ADR-10), `TECH_STACK.md` §4.3/§18, `MATCHING_ENGINE.md` §4, `PUBLIC_WALL.md` §5, `CODING_STANDARDS.md` §3, `DATABASE_SCHEMA.md` §1.3/§1.11/§25 — vs the actual schema tables in `DATABASE_SCHEMA.md` §5–18.
- **Explanation:** The architecture, tech-stack, matching, wall, and even the schema's own *philosophy/naming-convention* sections consistently refer to the campus-scoping column as **`campus_id`** (ADR-10 is literally titled "Campus scoping as a core dimension" and specifies `campus_id`). But **every actual table** in `DATABASE_SCHEMA.md` uses **`university_id`** as the column/FK name (→ `universities`). `DATABASE_SCHEMA.md` §1.3 gives `campus_id` as the example column name while §25 hedges with `campus_id`/`university_id`. This will cause confusion and inconsistent column naming in implementation, and breaks the "single source of truth" intent.
- **Recommended solution:** Choose **one** name and apply it everywhere. Recommendation: keep **`university_id`** as the column (it matches the `universities` table and FK convention `<table>_id`), and update all prose references (`campus_id`) across the other docs to `university_id`, while retaining "campus scoping" as the *concept* name. Alternatively rename the table to `campuses`/column to `campus_id` — but that is more churn. Either way, eliminate the dual naming.

### H-2 — `messages` partitioning conflicts with single-column UUID primary key
- **Severity:** High
- **Affected documents:** `DATABASE_SCHEMA.md` §8.1 (`messages`), §1.11, §21–22; `ARCHITECTURE.md` §12; `TECH_STACK.md` §18
- **Explanation:** The docs repeatedly state `messages` (and `notifications`, `audit_logs`, `engagement_events`) are "partition-ready" and will be **range-partitioned by `created_at`**. In PostgreSQL, a partitioned table's **partition key must be part of every unique/primary key**. `messages` is specified with PK = `id` (UUID) alone. As written, partitioning by `created_at` would be impossible without changing the PK to a composite `(id, created_at)` (or `(created_at, id)`). This is a latent migration blocker that contradicts the stated future-partitioning plan.
- **Recommended solution:** For tables explicitly slated for time-partitioning, document that their primary key is the **composite `(created_at, id)`** (or include the partition key in the PK), and note this constraint in `DATABASE_SCHEMA.md` §1.11. Cursor pagination already uses `(created_at, id)`, so this aligns naturally. No change needed now, but the schema must reflect it before those tables are created.

### H-3 — No proactive media moderation at MVP (content-safety gap)
- **Severity:** High
- **Affected documents:** `MEDIA_SYSTEM.md` §9–10, `SECURITY.md` §7, `PROJECT_VISION.md` §11, `PRODUCT_REQUIREMENTS.md` §13.2
- **Explanation:** Media safety is **reactive only** at MVP — report → review → remove. Virus scanning and AI content detection are marked "future." For a platform that allows image/video uploads among a young user base, the absence of any proactive scan for illegal content (especially CSAM) before display is a meaningful safety and legal gap, even if reactive moderation exists. The vision states "safety tooling ships before the surfaces it protects," which is in tension with shipping media uploads with no proactive scanning.
- **Recommended solution:** Add an explicit MVP decision on minimum proactive media safety: at minimum, a documented illegal-content reporting fast-path + a commitment to integrate a hash-matching/scanning service before media is broadly enabled, and a clear escalation/legal-reporting procedure. Decide whether image/voice ships before scanning is available, and record that risk acceptance explicitly in `SECURITY.md` and `MEDIA_SYSTEM.md`.

### H-4 — Single-VM SPOF contradicts 99.5% availability target
- **Severity:** High
- **Affected documents:** `PRODUCT_REQUIREMENTS.md` §10.4 (NFR-A1 ≥99.5%), `ARCHITECTURE.md` §14.1, `TECH_STACK.md` §9
- **Explanation:** `PRODUCT_REQUIREMENTS.md` sets an availability target of ≥99.5% (trending to 99.9%). The architecture runs **everything on a single Oracle ARM VM** — Nginx, Node API, Socket.IO, **and** PostgreSQL — explicitly acknowledged as a single point of failure with no failover during validation. A single VM hosting the DB and app, with daily backups and PM2 restart as the only recovery, cannot credibly guarantee 99.5% (≈3.6h downtime/month) once real incidents (VM reboot, disk, OOM from co-located Postgres) occur. The NFR and the deployment reality are in tension.
- **Recommended solution:** Either (a) soften the validation-phase availability target (e.g., "best-effort, no formal SLA during validation; 99.5% target begins at Phase 2 with DB/app separation") in `PRODUCT_REQUIREMENTS.md`, or (b) bring forward DB/app separation and a basic failover plan. Also flag the co-location of PostgreSQL with the app as a resource-contention risk in `ARCHITECTURE.md` §14.

---

## MEDIUM

### M-1 — Polymorphic `reactions` and `reports` have no referential integrity
- **Severity:** Medium
- **Affected documents:** `DATABASE_SCHEMA.md` §10.3 (`reactions`), §15.1 (`reports`)
- **Explanation:** Both tables use a polymorphic `(target_type, target_id)` with **no foreign key** on `target_id` (acknowledged as a deliberate trade-off). The risk: orphaned reactions/reports when targets are hard-deleted, no DB-level integrity, and reliance on application logic + cleanup jobs. At "millions of reactions" scale, orphan accumulation and count drift are real.
- **Recommended solution:** Accept the trade-off but document the mitigations concretely: a scheduled orphan-cleanup job (already implied), and a reconciliation job for maintained counters (`reaction_count`). Consider per-target reaction tables only if integrity problems materialize. Note the decision explicitly as a risk in `DATABASE_SCHEMA.md`.

### M-2 — `messages.delivery_status` overlaps with `message_receipts`
- **Severity:** Medium
- **Affected documents:** `DATABASE_SCHEMA.md` §8.1, §8.4; `SOCKET_EVENTS.md` §5
- **Explanation:** `messages` carries a `delivery_status` enum (`sent`/`delivered`/`read`) **and** there is a separate `message_receipts` high-water-mark table tracking read state per user per conversation. For 1:1 conversations these two representations of "read" can disagree, and it is ambiguous which is authoritative. Dual sources of truth for read state invite drift.
- **Recommended solution:** Clarify roles: keep `delivery_status` as a coarse per-message delivery indicator (sent→delivered) and make `message_receipts` the **authoritative read state**, or drop `read` from `delivery_status` to avoid two read sources. Document the reconciliation rule in `DATABASE_SCHEMA.md` §8.

### M-3 — Subscriptions API exists but no payment-provider decision
- **Severity:** Medium
- **Affected documents:** `API_SPEC.md` §14, `DATABASE_SCHEMA.md` §17, `ADMIN_PANEL.md` §8, `TECH_STACK.md`
- **Explanation:** There are `/subscriptions/purchase` and `/subscriptions/verify` endpoints and a `subscription_transactions` table with `provider`/`provider_ref`, but **no document specifies the payment gateway** (e.g., Razorpay/Stripe) or the India-specific payment approach. This is a missing architecture decision for a P2 feature that the API already promises.
- **Recommended solution:** Add a payment-provider decision (likely Razorpay for India) as a future TDR in `TECH_STACK.md` §19 or a note in `DATABASE_SCHEMA.md` §17.4, marked future. Since subscriptions are P2 and gating is globally toggleable, this is not blocking — but the endpoints should be marked "contract reserved; provider TBD."

### M-4 — Email delivery provider undefined
- **Severity:** Medium
- **Affected documents:** `NOTIFICATION_SYSTEM.md` §3, `DATABASE_SCHEMA.md` §16.3 (`notification_queue`), `TECH_STACK.md` §9
- **Explanation:** Email notifications are a documented channel with a queue, but **no document names the email delivery mechanism** (SMTP/SES/Oracle Email Delivery/etc.). The V1 audit PDF mentioned "Email Delivery" under Oracle Cloud, but no spec confirms it. This is an undocumented dependency for a launch-relevant feature.
- **Recommended solution:** Record the chosen email provider (e.g., Oracle Cloud Email Delivery or a transactional email service) in `TECH_STACK.md`, and reference it from `NOTIFICATION_SYSTEM.md` §3. Mark as MVP-needed if email notifications are in the launch scope.

### M-5 — Rate limiting has no shared store defined for multi-instance scale
- **Severity:** Medium
- **Affected documents:** `SECURITY.md` §2/§16, `API_SPEC.md` §16, `ARCHITECTURE.md` §12, `TECH_STACK.md` §18
- **Explanation:** Rate limiting is specified at the edge and per-endpoint/per-socket. At single-instance scale this works in-memory, but the scaling plan introduces **multiple API/Socket.IO instances** (10k+ users). In-memory rate limits become per-instance and ineffective without a **shared store (Redis)**. The dependency is implied (Redis appears in scaling) but the rate-limiting → Redis link is never stated.
- **Recommended solution:** Document that rate limiting moves to a Redis-backed shared store at the same scaling threshold where Redis is introduced (`ARCHITECTURE.md` §12 / `TECH_STACK.md` §18). No change now; make the dependency explicit.

### M-6 — New technologies vs `rules.md` "no new technology without approval"
- **Severity:** Medium (governance)
- **Affected documents:** `rules.md`, `TECH_STACK.md` §2 / §15
- **Explanation:** `rules.md` mandates "Never introduce a new technology unless approved." `TECH_STACK.md` adopts React Query, React Hook Form, Zod, and Drizzle ORM, none of which appear in the original V1/V2 blueprint source. These were introduced via the tech-stack task (effectively CTO approval), but there is no explicit record that they were ratified against the rule — a governance gap that could recur.
- **Recommended solution:** Add a one-line ratification note in `TECH_STACK.md` §15 (or `rules.md`) stating these libraries are the approved baseline stack as of v1.0, so the "no new tech" rule has a clear, dated baseline to measure future additions against.

---

## LOW

### L-1 — Duplicated security & scalability content (drift risk)
- **Severity:** Low
- **Affected documents:** `SECURITY.md`, `ARCHITECTURE.md` §11–12, `TECH_STACK.md` §17–18, `AUTH_SYSTEM.md` §10, `ADMIN_PANEL.md` §13, `API_SPEC.md` §16
- **Explanation:** Security layers and the 100→100k scalability ladder are restated in several documents. This is partly by design (each references `SECURITY.md`), but the scalability ladder in particular is near-duplicated verbatim in `TECH_STACK.md` §18 and `ARCHITECTURE.md` §12, which will drift if one is edited.
- **Recommended solution:** Designate one canonical owner per topic (e.g., `SECURITY.md` for security, `ARCHITECTURE.md` for scalability) and reduce the others to short summaries + references. Low priority; cosmetic until an edit causes drift.

### L-2 — CSRF protection vs cookie-based refresh token
- **Severity:** Low
- **Affected documents:** `SECURITY.md` §2, `AUTH_SYSTEM.md` §5
- **Explanation:** `SECURITY.md` argues CSRF is mitigated by token-based (non-cookie) auth, but `AUTH_SYSTEM.md` stores the **refresh token in an httpOnly cookie**. A cookie-based refresh endpoint *is* CSRF-exposed and needs explicit anti-CSRF protection — the docs note "anti-CSRF where cookies are used" but don't tie it specifically to the refresh endpoint.
- **Recommended solution:** State explicitly that the refresh endpoint (cookie-based) uses anti-CSRF protection (SameSite=strict/lax + CSRF token or origin check) in `AUTH_SYSTEM.md` §5 / `SECURITY.md` §2.

### L-3 — `users.last_seen_at` write amplification
- **Severity:** Low
- **Affected documents:** `DATABASE_SCHEMA.md` §5.3, `ARCHITECTURE.md` §6.6
- **Explanation:** `last_seen_at` lives on the hot `users` row while presence is "connection-derived." If `last_seen_at` is updated on every heartbeat, it creates heavy write amplification on the most-read table.
- **Recommended solution:** Document an update cadence (e.g., write `last_seen_at` at most every N minutes or only on disconnect), or move volatile presence to a separate lightweight store. Note in `DATABASE_SCHEMA.md` §5.3.

### L-4 — UUIDv7 generation dependency unspecified
- **Severity:** Low
- **Affected documents:** `DATABASE_SCHEMA.md` §1.4, §26.3
- **Explanation:** "UUIDv7 preferred where available" — native Postgres `uuidv7()` requires PG18+, otherwise an extension or app-side generation is needed. The doc doesn't say where v7 IDs are generated (DB vs app), which affects implementation.
- **Recommended solution:** Specify generation location (recommend app-side via a library, or DB extension) in `DATABASE_SCHEMA.md` §26.3.

### L-5 — Internationalization / localization not addressed
- **Severity:** Low
- **Affected documents:** `PROJECT_VISION.md` (India, multi-campus), `UI_GUIDELINES.md`, `PRODUCT_REQUIREMENTS.md`
- **Explanation:** The product targets Indian colleges and national scale, but no document addresses language/localization (i18n). UTC time storage is specified (good), but multi-language UI is unmentioned. Likely fine for MVP (English), but it's an unrecorded assumption.
- **Recommended solution:** Add an explicit assumption ("English-only at MVP; i18n is future") to `PRODUCT_REQUIREMENTS.md` §15 assumptions or `UI_GUIDELINES.md`.

---

## Edge Cases Worth Documenting (no current contradiction, but gaps)

| Edge case | Affected docs | Note |
|-----------|---------------|------|
| Account deletion while in an active anonymous session or pending friend request | `AUTH_SYSTEM.md` §8, `MATCHING_ENGINE.md`, `FRIEND_SYSTEM.md` | Not specified — define session/request teardown on deletion |
| Messages authored by a later-deleted user (PII purge) | `DATABASE_SCHEMA.md` §8.1 | `sender_id` "RESTRICT/SET NULL on purge" is ambiguous — pick one and define how purged-author messages display |
| Both users block/report mid-session simultaneously | `MATCHING_ENGINE.md` §7 | Define resolution order |
| Subscription lapses mid-action (e.g., premium-only matching priority) | `DATABASE_SCHEMA.md` §17, `MATCHING_ENGINE.md` §11 | Define graceful downgrade timing |
| University with multiple email domains / shared domains | `DATABASE_SCHEMA.md` §5.1 | `email_domains` unique across table — confirm no legitimate domain collisions |
| TURN relay bandwidth cost on free tier (future calls) | `TECH_STACK.md` §10, `ARCHITECTURE.md` §15 | Cost of TURN relay is unaddressed for the zero-cost phase |

---

## Recommended Action Order

1. **Resolve C-1 and C-2 first** — they are enum-level contradictions that block correct implementation of auth, bans, and admin. Cheap to fix, high impact.
2. **Fix H-1 naming** before any schema/code is written — it touches every scoped table and many docs.
3. **Record H-2** (composite PK for partition-ready tables) in the schema now, so tables are created correctly the first time.
4. **Decide H-3 and H-4** (media safety posture; availability target vs SPOF) as explicit, documented risk acceptances or plan changes.
5. **Address Medium items** as part of normal pre-implementation cleanup (M-3/M-4 can stay "reserved/future" if those features are out of MVP scope).
6. **Low items** are cosmetic or future; batch them.

---

> **Next step:** Awaiting approval. On your go-ahead I can apply the fixes for any subset of these findings (C-1, C-2, and H-1 are the highest-value first edits). I will not modify any document until you approve specific items.
