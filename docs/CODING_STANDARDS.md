# Campusly V2 — Coding Standards & Engineering Handbook

> **Document type:** Engineering standards — official handbook
> **Product:** Campusly V2 (formerly PU Chat)
> **Status:** Authoritative v1.0
> **Authority:** Every developer and AI assistant MUST follow this document. It defines coding conventions, project structure, naming, Git workflow, AI rules, testing, and review guidelines. Deviations require explicit approval and an update here.
> **Companion documents:** `TECH_STACK.md` §12–14 (folder structure, coding standards, principles), `SECURITY.md`, `UI_GUIDELINES.md`, `ARCHITECTURE.md`

---

## Table of Contents
1. [Engineering Philosophy](#1-engineering-philosophy)
2. [Project Structure](#2-project-structure)
3. [Naming Conventions](#3-naming-conventions)
4. [TypeScript Standards](#4-typescript-standards)
5. [Code Organization](#5-code-organization)
6. [Error Handling](#6-error-handling)
7. [Logging Standards](#7-logging-standards)
8. [Git Workflow](#8-git-workflow)
9. [Documentation Standards](#9-documentation-standards)
10. [AI Development Rules](#10-ai-development-rules)
11. [Performance Guidelines](#11-performance-guidelines)
12. [Security Guidelines](#12-security-guidelines)
13. [Testing Expectations](#13-testing-expectations)
14. [Code Review Checklist](#14-code-review-checklist)
15. [Engineering Principles](#15-engineering-principles)

---

## 1. Engineering Philosophy

- **Clean Code.** Code is read far more than it is written. Optimize for the next engineer — clarity over cleverness.
- **Simplicity.** The simplest solution that works is the right one (KISS). Avoid abstractions until they are proven necessary.
- **Readability.** Names reveal intent; structure reveals flow; comments explain *why*, not *what*.
- **Long-term Maintainability.** Prefer maintainability over quick fixes (`rules.md`). Every shortcut compounds into debt.
- **Feature-first Development.** Code is organized around product features, not technical layers alone. A feature's code is cohesive and discoverable in one place.
- **Documentation-first Development.** Features are documented in `/docs` *before* implementation. If it isn't documented, it isn't built. Implementation must conform to documentation.

---

## 2. Project Structure

The monorepo mirrors `TECH_STACK.md` §12. Every folder has a clear purpose.

```
campusly/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   ├── app/              # App Router (routes, layouts, pages)
│   │   ├── components/       # Shared UI primitives (shadcn-based)
│   │   ├── features/         # Feature modules (wall, chat, matching, ...)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Client utilities, API/socket clients
│   │   └── styles/           # Tailwind config, global styles
│   └── api/                  # Express + Socket.IO backend
│       ├── src/
│       │   ├── http/         # Routes + controllers (thin)
│       │   ├── realtime/     # Socket.IO handlers (thin)
│       │   ├── services/     # Business logic (transport-agnostic)
│       │   ├── repositories/ # Data access (Drizzle)
│       │   ├── domain/       # Entities, domain types
│       │   ├── db/           # Drizzle schema + migrations
│       │   ├── middleware/   # Auth, validation, rate limiting, errors
│       │   └── config/       # Env loading, constants
│       └── tests/            # Backend tests
├── packages/
│   ├── shared-types/         # Cross-boundary TS types + Zod schemas
│   └── config/               # Shared ESLint, TS, Prettier configs
├── docs/                     # All documentation (this set)
├── assets/                   # Static design assets, brand
├── scripts/                  # Maintenance, backup, seed scripts
├── infra/                    # Nginx config, deploy docs (no secrets)
└── .github/workflows/        # GitHub Actions CI
```

| Folder | Purpose |
|--------|---------|
| `apps/web` | The Next.js frontend — everything user-facing |
| `apps/api` | The Express + Socket.IO backend — all server logic |
| `packages/shared-types` | The single source of truth for cross-boundary types and Zod validation |
| `packages/config` | Shared linting/formatting/TS configuration |
| `docs/` | Product, architecture, and engineering documentation |
| `assets/` | Brand assets, images |
| `scripts/` | Operational scripts (backup, seed, cleanup) |
| `infra/` | Infrastructure configuration (Nginx, deploy notes — never secrets) |

---

## 3. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| **Files (components)** | `PascalCase.tsx` | `MatchCard.tsx` |
| **Files (modules/utils)** | `camelCase.ts` | `matchService.ts` |
| **React components** | `PascalCase` | `CampusWall` |
| **Custom hooks** | `use` prefix, `camelCase` | `useFriendStatus` |
| **Services** | `<feature>Service` | `matchService`, `wallService` |
| **Controllers** | `<feature>Controller` | `matchController` |
| **Routes** | `<feature>.routes.ts` | `match.routes.ts` |
| **Types / Interfaces** | `PascalCase` | `MatchSession`, `UserProfile` |
| **Enums** | `PascalCase` | `AccountStatus` |
| **Database tables** | `plural snake_case` | `wall_posts`, `friend_requests` |
| **Database columns** | `snake_case` | `created_at`, `university_id` |
| **Environment variables** | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `JWT_SECRET` |
| **Variables / functions** | `camelCase` | `createMatchSession` |
| **Constants** | `UPPER_SNAKE_CASE` | `MAX_QUEUE_TIMEOUT_MS` |
| **Booleans** | `is/has/can` prefix | `isVerified`, `hasMedia` |

**Rule.** Names reveal intent. A longer name that is clear beats a shorter one that is ambiguous.

---

## 4. TypeScript Standards

- **Strict mode on** — `strict: true` in all `tsconfig`. No implicit `any`.
- **No `any`** — use `unknown` + narrowing, or proper types. Any use of `any` requires justification in code review.
- **Prefer types/inference** — let Drizzle and Zod infer types. Never manually duplicate a shape the system can derive.
- **Explicit public signatures** — exported functions declare parameter and return types.
- **No non-null assertions (`!`)** — unless provably safe and commented.
- **Use `type` for data shapes, `interface` for contracts** that may be implemented/extended.
- **Enums for closed sets** — use string enums or const objects for discriminators.
- **Generics** — use when a function genuinely works across types; avoid premature generic abstractions.
- **Organize types** — domain types live in `domain/`; shared cross-boundary types in `packages/shared-types`.

---

## 5. Code Organization

| Principle | Application |
|-----------|-------------|
| **Feature-based architecture** | Frontend: `features/<name>/` holds the feature's components, hooks, and state. Backend: services/repositories/handlers grouped by feature. |
| **Separation of concerns** | HTTP/socket handlers are thin (validate → delegate → respond); business logic lives in services; data access in repositories. |
| **Reusable utilities** | Shared helpers live in `lib/` (frontend) or `utils/` (backend); extract only when genuinely reused (avoid premature abstraction). |
| **Service layer** | Transport-agnostic business rules; the same logic serves REST and Socket.IO. |
| **Repository layer** | The only layer that touches the database (via Drizzle); encapsulates queries behind intention-revealing methods. |
| **Validation layer** | Zod schemas at the boundary; shared in `packages/shared-types`. |

Dependencies point **inward**: transport → services → repositories → database. Outer layers depend on inner; inner layers never import from outer.

---

## 6. Error Handling

- **Typed, centralized errors.** Use well-defined error types (validation, not-found, forbidden, conflict, server). No throwing raw strings.
- **Fail at the edge.** Validate input early; reject bad data before it reaches services.
- **Central error handler.** Express error middleware maps errors to consistent HTTP responses. Socket handlers catch and return structured ack errors.
- **Never swallow errors.** Catch only to add context or recover meaningfully.
- **Never leak internals.** Responses never expose stack traces, SQL, or secrets.
- **User-friendly messages.** Client-facing errors use clear, non-technical language. Technical detail goes to logs.
- **Recovery.** Where possible, offer retry or guidance — not just failure.

---

## 7. Logging Standards

| Rule | Details |
|------|---------|
| **Structured** | Log as JSON with levels (error/warn/info/debug) and correlation IDs |
| **What to log** | Meaningful events: request boundaries, service actions, errors, auth events |
| **What never to log** | Secrets, tokens, passwords, full PII, message content, file bytes |
| **Debug logs** | Useful in development; disabled in production |
| **Production logs** | Error + warn + info; concise; actionable |
| **Security** | Auth events and privileged actions are audit-logged immutably (`SECURITY.md` §9) |

---

## 8. Git Workflow

### Branch naming

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready; always deployable |
| `develop` | Integration branch (if used); pre-production |
| `feature/<name>` | New feature work |
| `fix/<name>` | Bug fixes |
| `docs/<name>` | Documentation updates |
| `refactor/<name>` | Refactoring without behavior change |

### Commit messages

Format: `<type>: <short description>`

| Type | Use |
|------|-----|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation |
| `refactor:` | Code restructure (no behavior change) |
| `chore:` | Tooling, deps, configuration |
| `test:` | Adding/fixing tests |

Messages are present-tense, imperative, concise: `feat: add anonymous matching queue`, not `added queue`.

### Pull request expectations
- PRs target `main` (or `develop` if used).
- CI must pass (type-check, lint, tests) before merge.
- At least one review from a team member.
- Description includes: **what**, **why**, and **how to test**.
- Keep PRs focused (one feature/fix per PR); break large work into incremental PRs.

---

## 9. Documentation Standards

Every feature and major component must be documented. Documentation is a **precondition** for implementation, not an afterthought.

| Requirement | Details |
|-------------|---------|
| **Purpose** | What this module/feature does and why |
| **Dependencies** | What it relies on (other modules, services, data) |
| **Limitations** | Known constraints or out-of-scope items |
| **Future considerations** | Planned expansion or reserved extension points |

**Rules.**
- Architecture/product docs live in `/docs` and are updated in the same PR as related changes.
- Code-level comments explain *why*, not *what*. Document trade-offs and non-obvious decisions.
- Reference existing `/docs` documents (e.g., `see DATABASE_SCHEMA.md §7`) rather than duplicating content.
- Every public function and service method gets a brief doc comment.

---

## 10. AI Development Rules

AI assistants (Claude, Kiro, Copilot, etc.) are powerful contributors — within boundaries. These rules ensure AI output remains consistent with the project.

| Rule | Explanation |
|------|-------------|
| **Never modify architecture without approval** | The architecture is defined in `/docs`; structural changes require human sign-off and a doc update |
| **Always follow documentation** | All `/docs` are required reading; implementation must conform |
| **Never duplicate logic** | Reuse existing services and utilities; ask where logic should live if unclear |
| **Prefer reusable components** | Use shared primitives from `components/` and `packages/shared-types` |
| **Explain significant design decisions** | When choosing between approaches, document the reasoning in a comment or PR description |
| **Ask for clarification** | If requirements conflict or documentation is ambiguous, ask — do not guess |
| **Never introduce new technology** | No new libraries, frameworks, or tools without explicit approval (`rules.md`) |
| **Never hardcode secrets** | Always use environment variables |
| **Follow naming and style conventions** | This document's rules are non-negotiable for generated code |
| **Validate all input** | Every external boundary is validated; never trust client data |

---

## 11. Performance Guidelines

| Guideline | Details |
|-----------|---------|
| **Avoid unnecessary re-renders** | Memoize expensive computations; stabilize callbacks; keep state minimal and co-located |
| **Efficient database queries** | Use indexed queries; maintain counters over `COUNT(*)`; explain-analyze hot paths |
| **Lazy loading** | Load media, heavy components, and below-the-fold content on demand |
| **Pagination** | Cursor-based for feeds; never unbounded `SELECT *` |
| **Memoization** | Use where measurement shows benefit; avoid premature/blanket memoization |
| **Avoid premature optimization** | Write clear code first; optimize only where profiling reveals a bottleneck |

Performance is critical for our audience (mid-range mobile, variable networks), but clarity is never sacrificed for speculative speed gains. Optimize with data, not intuition.

---

## 12. Security Guidelines

The full model lives in `SECURITY.md`. Non-negotiable coding standards:

| Standard | Behavior |
|----------|----------|
| **Input validation** | Zod at every boundary; reject before reaching services |
| **Secret management** | Environment variables only; never in code, commits, or logs |
| **Authentication checks** | JWT validated on every REST request and socket connection; middleware enforced |
| **Authorization** | RBAC checked in the service layer; the client is never the gate |
| **Safe logging** | Never log secrets, tokens, or PII |
| **Parameterized queries** | All SQL via Drizzle; never string-constructed queries |
| **Output encoding** | Prevent XSS through framework defaults and sanitization |

---

## 13. Testing Expectations

Testing ensures confidence in changes and protects against regression.

| Level | Scope | Expectation |
|-------|-------|-------------|
| **Unit tests** | Services, utilities, validation schemas | Cover core business logic and edge cases |
| **Integration tests** | API endpoints, repository → DB flows | Verify transport + service + data together |
| **API tests** | REST endpoints end-to-end | Confirm request/response contracts |
| **Socket tests** | Key realtime flows (matching, messaging) | Verify event delivery and authorization |
| **Manual QA** | Flows that require real browser/device interaction | Critical paths before release |

**Rules.**
- Tests live alongside the code they test (co-located or in a `tests/` sibling).
- Tests are part of the PR — new logic ships with coverage.
- CI runs type-check + lint + tests on every push/PR; merge requires green.
- Tests are **fast, isolated, and deterministic** — no flaky tests in the suite.

---

## 14. Code Review Checklist

Every PR reviewer checks:

| Area | Question |
|------|----------|
| **Readability** | Is the intent clear? Would a new engineer understand it? |
| **Performance** | Are queries efficient? Are re-renders minimized? Any unbounded operations? |
| **Security** | Input validated? Auth/authz checked? Secrets safe? No injection paths? |
| **Accessibility** | Keyboard-navigable? Aria-labels on icons? Contrast? |
| **Error handling** | Failures handled gracefully? No swallowed errors? User-friendly messages? |
| **Documentation** | Comments on *why*? Doc update if behavior changed? |
| **Reusability** | Using existing components/utils? Avoiding duplication? |
| **Consistency** | Following naming, structure, and style conventions in this document? |
| **Tests** | Adequate coverage for the change? Edge cases? |

If any answer is "no," the PR needs revision before merge.

---

## 15. Engineering Principles

The permanent values behind these standards, ordered by resolution priority.

| Principle | Meaning |
|-----------|---------|
| **SOLID** | Single-responsibility, open/closed, Liskov, interface-segregation, dependency-inversion — the backbone of our layered architecture |
| **DRY** | One source of truth for logic, types, and validation; no duplicated business rules |
| **KISS** | Simplest design that works; complexity only when justified |
| **YAGNI** | Don't build for imagined futures; build what's needed now; keep extension points open |
| **Clean Architecture** | Business logic independent of frameworks and transports; dependencies inward |
| **Feature-first organization** | Code grouped by what it does for the user, not just by technical role |
| **Documentation-first** | Document before implement; if it isn't in `/docs`, it isn't approved |
| **Consistency over cleverness** | A uniform codebase is worth more than a locally brilliant one |

> When principles tension: **security > simplicity > performance > cleverness.**

---

## Closing Note

This document is the official engineering standard for Campusly V2. It defines how we write, organize, name, document, review, and ship code — ensuring the codebase remains **clean, consistent, and maintainable** even after years of development by many hands (human and AI).

It works alongside the project rules (`rules.md`), the tech stack (`TECH_STACK.md`), and the security handbook (`SECURITY.md`). Where engineering practice is unclear, this document decides. No deviation ships without approval and an update here.

*— Principal Software Engineer, Staff Frontend/Backend Engineer, Tech Lead & Engineering Manager, Campusly V2*
