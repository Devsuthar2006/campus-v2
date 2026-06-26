# Phase 13 — Subscriptions

> **Milestone:** Free and premium tiers exist; admins can grant/revoke; premium limits are enforced.

## Objective
Implement the subscription system: plans, user subscriptions, admin grant/revoke, premium feature gating, free trials, and the global subscription-requirement toggle (so the platform can run fully free during validation). Payment-provider integration is contract-reserved pending the provider decision (REVIEW_REPORT M-3); admin-grant and free operation work without it.

## Features Included
- Plans catalog; free vs. premium tiers; subscription status.
- Admin grant/revoke; free trials; premium feature gating (enhanced matching limits, media, priority).
- Global subscription-requirement toggle (feature flag).

## Dependencies
- **Documentation:** `PRODUCT_REQUIREMENTS.md` §8.17, `DATABASE_SCHEMA.md` §17 (Subscription module), `FEATURE_MATRIX.md` §14, `API_SPEC.md` §14, `ADMIN_PANEL.md` §8, `MATCHING_ENGINE.md` §11 (priority gating).
- **Phases:** 00–12 (admin grant/revoke, feature flags, gated features exist).

## Backend Tasks
- Implement subscription services over `DATABASE_SCHEMA.md` §17: `subscription_plans`, `user_subscriptions`, `subscription_transactions` (money as integer minor units).
- Implement entitlement sync to `users.subscription_status` (cache) and graceful downgrade on lapse/expiry (worker checks `current_period_end`).
- Implement admin grant/revoke (Phase 12) and free-trial via `source='trial'`.
- Implement premium gating in relevant services (matching limits/priority, media limits) — gates read `subscription_status`.
- Implement the global subscription-requirement feature flag (free-during-validation).
- Endpoints: plans, purchase, verify, current, cancel, trial (`API_SPEC.md` §14). Mark purchase/verify "provider TBD" (M-3) until a gateway is chosen.

## Frontend Tasks
- Premium plans screen (honest, no dark patterns — `PROJECT_VISION.md` Student First), current subscription status, upgrade/cancel flows, trial state; premium-feature affordances gated by status.

## Database Tasks
- Implement `DATABASE_SCHEMA.md` §17 tables; active-subscription partial index; `current_period_end` index for the expiry job; idempotent `(provider, provider_ref)` uniqueness on transactions.

## Socket Tasks
- None specific; subscription status changes surface via notifications (Phase 08) and the entitlement cache.

## UI Components
- Plans/pricing screen, subscription status card, upgrade/cancel, trial banner, premium-feature badges — per `UI_GUIDELINES.md`. Free tier must remain genuinely valuable.

## Security Considerations
- Entitlement enforced server-side (never client-trusted); admin grant/revoke RBAC-gated + audited; financial records append-only; payment specifics isolated (`SECURITY.md`; `DATABASE_SCHEMA.md` §17).

## Acceptance Criteria
- Free and premium tiers exist; admins grant/revoke; premium gates enforce enhanced limits server-side.
- Subscriptions downgrade gracefully on lapse; the global toggle can keep everything free during validation.
- The free experience remains fully usable (Student First).

## Deliverables
- Subscription system with admin control and premium gating — the sustainability layer, payment-provider-ready.

## Out of Scope
- Live payment-gateway integration (until M-3 decided), invoices, coupons (future — `DATABASE_SCHEMA.md` §17.4).

## Risks
- Premium gating leaks if checks are client-side; entitlement-cache drift (mitigated by server gates + sync job). Payment-provider decision is a prerequisite for real billing.

## Future Improvements
- Razorpay/provider integration, invoices, coupons, regional pricing (future).
