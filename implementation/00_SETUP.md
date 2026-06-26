# Phase 00 — Project Setup & Foundations

> **Milestone:** Repository, tooling, and infrastructure skeleton ready for feature development.
> **Governs:** All work must follow `/docs`. This phase introduces no product features.

## Objective
Establish the monorepo, toolchain, shared conventions, database connection, and deployment skeleton so every later phase has a stable, consistent foundation. This phase ends with an empty-but-running app: a Next.js frontend and an Express + Socket.IO backend that boot, connect to PostgreSQL, and deploy to the Oracle ARM VM — with no business features yet.

## Features Included
- Monorepo scaffolding (web + api + shared packages).
- TypeScript, ESLint, Prettier, Husky, CI pipeline.
- Database connection via Drizzle + migration tooling.
- Base Express server, Socket.IO server, Nginx config skeleton, PM2 process config.
- Health-check endpoint and a connectivity smoke test.

## Dependencies
- **Documentation:** `TECH_STACK.md` (§11 tools, §12 folder structure, §13 standards), `ARCHITECTURE.md` (§1, §14), `CODING_STANDARDS.md` (all), `DATABASE_SCHEMA.md` (§1 philosophy, §26 standards).
- **Phases:** None (this is the root phase).

## Backend Tasks
- Scaffold `apps/api` (Node.js + Express + TypeScript) per `TECH_STACK.md` §12, with the layered structure: `http/`, `realtime/`, `services/`, `repositories/`, `domain/`, `db/`, `middleware/`, `config/`.
- Configure environment loading (no hardcoded secrets — `SECURITY.md` §10) and a typed config module.
- Stand up a base Express app with the standard response envelope and centralized error handler (`API_SPEC.md` §2.3, §17; `CODING_STANDARDS.md` §6).
- Stand up the Socket.IO server attached to the same process (`ARCHITECTURE.md` §2.3).
- Add a `GET /api/v1/health` endpoint.
- Configure Drizzle + Drizzle Kit with migration scripts (`TECH_STACK.md` §5.3).

## Frontend Tasks
- Scaffold `apps/web` (Next.js + React + TypeScript) with App Router, Tailwind, and shadcn/ui initialized per `UI_GUIDELINES.md` (color tokens, Inter font, 8-pt spacing, radius scale, dark-first theme).
- Configure React Query, React Hook Form, and Zod baseline (`TECH_STACK.md` §2).
- Implement the theme system (light/dark, color inversion only) and base layout shell.
- Add an API client and a Socket.IO client wrapper (unauthenticated for now).

## Database Tasks
- Initialize the PostgreSQL database and Drizzle schema project per `DATABASE_SCHEMA.md` §26 (naming, UUID keys, `timestamptz`, enums).
- Create the migration workflow (forward-only, reviewed, tested) — no feature tables yet beyond what later phases introduce. Optionally seed `universities`/`branches` reference tables (`DATABASE_SCHEMA.md` §5.1–5.2) to unblock Phase 01.

## Socket Tasks
- Establish the Socket.IO server lifecycle and connection logging only (`SOCKET_EVENTS.md` §1–2). No domain events yet; authentication handshake is stubbed and completed in Phase 01.

## UI Components
- Per `UI_GUIDELINES.md`: base theme provider, app shell/layout, and the foundational shadcn primitives (Button, Card, Input) styled to the design tokens. No feature screens.

## Security Considerations
- HTTPS/WSS via Nginx, secrets in environment only, CORS and secure headers configured at the edge (`SECURITY.md` §10, §16). Establish the rate-limiting middleware seam (configured, minimal rules) for later phases.

## Acceptance Criteria
- `npm install` + dev scripts boot both apps with zero errors.
- Backend connects to PostgreSQL; a migration runs successfully.
- `GET /api/v1/health` returns the standard success envelope over HTTPS.
- A client establishes a Socket.IO connection.
- CI (type-check, lint, test placeholder) passes on a PR; Husky blocks bad commits.
- The app deploys to the Oracle ARM VM behind Nginx with PM2 and TLS (`ARCHITECTURE.md` §14).

## Deliverables
- Running monorepo, CI/CD pipeline, migration tooling, deployed skeleton, theme system, and shared config — the baseline every phase builds on.

## Out of Scope
- Any authentication logic, user data, or product feature. No real domain tables beyond optional reference data.

## Risks
- Oracle ARM/Nginx/TLS setup friction; Drizzle migration misconfiguration; monorepo tooling complexity. Mitigate by validating the deploy path early.

## Future Improvements
- Add a staging environment (`ARCHITECTURE.md` §14.9), Docker (future, `TECH_STACK.md` §19), and richer CI gates as the team grows.
