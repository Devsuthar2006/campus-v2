# Phase 15 — Deployment, Operations & Launch

> **Milestone:** Campusly V2 is deployed to production, monitored, backed up, and ready for its launch campus.

## Objective
Harden and operationalize the production deployment on Oracle Cloud ARM: Nginx + PM2 + TLS, environment/secret management, monitoring and alerting, daily backups with tested restore, and a staging environment for safe releases. This phase turns the working application into a reliably operated product, and prepares the controlled single-campus launch (`PRODUCT_REQUIREMENTS.md` §5.1).

## Features Included
- Production deployment (Oracle ARM VM, Ubuntu, Nginx reverse proxy, PM2, TLS).
- CI/CD to production; staging environment; environment/secret management.
- Monitoring, alerting, daily backups + tested restore, WAL archiving (PITR).
- Launch readiness for the first campus.

## Dependencies
- **Documentation:** `ARCHITECTURE.md` §13–14, `TECH_STACK.md` §9, `DATABASE_SCHEMA.md` §24 (backups), `SECURITY.md` §10–11, `PROJECT_VISION.md` §3 (1-year), `PRODUCT_REQUIREMENTS.md` §10.4.
- **Phases:** 00–14 (a tested, complete application).

## Backend Tasks
- Run database migrations as an explicit pre-start deploy step (`npm run db:migrate:deploy` — the production runner in `apps/api/src/db/migrate.ts`, built on production deps so it survives `npm ci --omit=dev`); the app never auto-migrates at boot. Sequence: **deploy artifacts → migrate → start service** (`INFRASTRUCTURE.md` §12.1, `infra/README.md`).
- Finalize production process management (PM2 cluster across ARM cores), graceful restart/zero-downtime reload (`ARCHITECTURE.md` §13.1).
- Implement/verify monitoring (process, resource, app metrics, uptime) and alerting on meaningful conditions (`ARCHITECTURE.md` §13.7–13.8).
- Implement daily PostgreSQL backups, periodic offsite exports, and WAL archiving for PITR; schedule a periodic test restore (`DATABASE_SCHEMA.md` §24).
- Verify background jobs (media/session/notification cleanup, analytics, retention) run reliably in production.

## Frontend Tasks
- Production build optimization (code splitting, image optimization, lazy loading — `UI_GUIDELINES.md` §13, `TECH_STACK.md` §16); verify performance budgets on mid-range mobile; final accessibility pass.

## Database Tasks
- Production database hardening: connection pooling readiness, index review against real query plans, retention jobs verified, backup/restore validated (`DATABASE_SCHEMA.md` §21, §23–24).

## Socket Tasks
- Verify production Socket.IO behavior behind Nginx (WSS upgrade, sticky-session readiness for future multi-instance), reconnection, and graceful degradation (`ARCHITECTURE.md` §13.2, §13.6).

## UI Components
- No new product UI; production polish, error/offline states verified (`UI_GUIDELINES.md` §16), maintenance-mode screen wired to the feature flag.

## Security Considerations
- TLS everywhere, secrets in environment/secret storage, firewall (only HTTPS/WSS exposed), prompt OS/dependency patching, encrypted access-controlled backups, incident-response process ready (`SECURITY.md` §10–11). Acknowledge single-VM SPOF vs the availability target (REVIEW_REPORT H-4) and record the validation-phase posture.

## Acceptance Criteria
- Production deploys via CI/CD behind Nginx + PM2 + TLS; staging mirrors production.
- Monitoring and alerting are live; daily backups run and a test restore succeeds; PITR is configured.
- Core journeys work in production at acceptable performance; maintenance mode and graceful degradation function.
- The platform is ready for the controlled single-campus launch.

## Deliverables
- A monitored, backed-up, reliably deployed Campusly V2 in production, launch-ready for the first campus.

## Out of Scope
- Multi-instance horizontal scaling, Redis/Socket.IO adapter, read replicas, load balancers, CDN, containerization/Kubernetes — all future, introduced by the scalability ladder when metrics justify (`ARCHITECTURE.md` §12; `TECH_STACK.md` §18–19).

## Risks
- Single-VM SPOF and DB/app co-location vs the 99.5% target (H-4); backup-restore gaps if untested. Mitigate by testing restores and planning Phase-2 DB/app separation.

## Future Improvements
- DB/app separation, Redis, read replicas, load balancer, CDN, multi-region — the documented scaling path as the launch campus grows.
