# Phase 14 — Testing & Quality Assurance

> **Milestone:** The platform has dependable automated coverage and a QA process before launch.

## Objective
Establish comprehensive testing across the stack — unit, integration, API, socket, and manual QA — formalizing the expectations from `CODING_STANDARDS.md` §13. Testing is woven into every prior phase (each ships with coverage); this phase consolidates the strategy, fills gaps, hardens critical paths, and gates releases. It also validates the cross-cutting invariants (matching atomicity, accountable anonymity, privacy enforcement).

## Features Included
- Unit tests (services, utilities, Zod schemas).
- Integration tests (API endpoints, repository→DB flows).
- API contract tests (`API_SPEC.md`) and Socket.IO flow tests (`SOCKET_EVENTS.md`).
- Manual QA checklist for critical user journeys (`PRODUCT_REQUIREMENTS.md` §11).
- CI gating (type-check, lint, tests) on every PR.

## Dependencies
- **Documentation:** `CODING_STANDARDS.md` §13–14, `TECH_STACK.md` §11, `API_SPEC.md`, `SOCKET_EVENTS.md`, `PRODUCT_REQUIREMENTS.md` §9–11 (functional reqs & journeys), `SECURITY.md`.
- **Phases:** 00–13 (everything under test).

## Backend Tasks
- Build out unit tests for service-layer business rules: matching atomicity (no duplicate/ghost sessions), friend acceptance transaction, moderation+audit atomicity, block enforcement, privacy/visibility checks.
- Integration tests for repositories against a test PostgreSQL (migrations applied).
- API contract tests asserting the standard envelope, status codes, pagination, and error catalogue (`API_SPEC.md` §2, §17).
- Socket flow tests for matching, messaging, presence, and notifications (`SOCKET_EVENTS.md`).
- Verify NFR targets where testable (latency, pagination correctness — `PRODUCT_REQUIREMENTS.md` §10).

## Frontend Tasks
- Component/interaction tests for critical UI (auth, matching, chat, wall, friends); form validation (Zod) tests; accessibility checks (keyboard, contrast — `UI_GUIDELINES.md` §14, with manual assistive-tech testing noted as required).
- End-to-end happy-path tests for the core journeys (`PRODUCT_REQUIREMENTS.md` §11).

## Database Tasks
- Test-database setup, migration verification, and seed/fixtures; verify constraints (FKs, uniqueness, check constraints) and retention/cleanup jobs behave correctly (`DATABASE_SCHEMA.md` §23).

## Socket Tasks
- Author socket integration tests covering connection auth, room authorization (no cross-conversation leakage), and event contracts (`SOCKET_EVENTS.md` §14).

## UI Components
- No new product UI; add test harnesses/fixtures only.

## Security Considerations
- Security-focused tests: authz on every endpoint, input-validation rejection, rate-limit behavior, anonymous-author non-leakage, media access control, audit-log immutability (`SECURITY.md` §2–9). Verify accountable anonymity holds end-to-end.

## Acceptance Criteria
- CI runs type-check, lint, and the full test suite on every PR; green is required to merge.
- Critical paths (auth, matching, chat, friends, wall, moderation) have meaningful coverage; tests are fast, isolated, deterministic.
- The manual QA checklist passes for all core journeys before release.

## Deliverables
- A dependable test suite, CI gating, and a QA checklist — confidence to ship and to change safely.

## Out of Scope
- Load/performance testing at 100k scale (do when approaching that scale), property-based testing unless adopted, chaos testing (future).

## Risks
- Flaky socket/integration tests; under-tested concurrency (matching). Mitigate with deterministic test design and focused concurrency tests.

## Future Improvements
- Load testing, contract-test automation against the live API, expanded E2E coverage, performance budgets in CI.
