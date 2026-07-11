# Phase 1: Foundation — Build Plan

**Status:** Approved by owner 10/07/2026. Execution in progress.

## Context

This is a greenfield build. Before this phase, the repo contained only `CLAUDE.md`, `.gitignore`, `.env.example`, and a git connection to `github.com/david-agentic/ml-trading-ops`. Nothing else existed. Phase 1 delivers the foundation every later phase builds on: repo scaffolding, database schema, auth, RBAC, base UI shell, PWA plumbing, CI, and a live deploy the owner can log into.

Two architectural questions came up that CLAUDE.md didn't anticipate (technology has moved since it was written) and needed the owner's explicit sign-off rather than a silent technical call. Both were resolved with the owner directly before this plan was finalized:

1. **Web deployment adapter:** `@cloudflare/next-on-pages` (the tool CLAUDE.md's literal "Cloudflare Pages" wording implies) is now deprecated by Cloudflare with no further development, and restricts every route to an Edge-only runtime. **Decision: switch to OpenNext's Cloudflare adapter** (`@opennextjs/cloudflare`), which deploys `apps/web` as a Cloudflare Worker with Workers Static Assets instead of the literal "Pages" product — same GitHub-connected auto-deploy on push to `main`, same per-PR preview URLs, full Node.js runtime support (no Edge-only restriction). This requires a small wording amendment to CLAUDE.md §3/§17 (product name change only, behavior preserved), done as the first commit of this phase.
2. **Workers plan tier:** Argon2id password hashing (the Workers-compatible replacement for bcrypt, since bcrypt needs native bindings unavailable in the Workers V8 isolate) needs real CPU budget. **Decision: stay on the Workers Free plan** (10ms CPU/request cap). This means Argon2id must be tuned to a lower memory/iteration cost than OWASP's ideal recommendation to reliably fit the budget — a small, deliberate security-margin tradeoff to avoid the $5/mo Paid plan, to be revisited before real business data goes live.

## Decisions locked for this phase (technical choices, not business rules — documented per CLAUDE.md's own instruction to decide-and-note these)

- **DB access:** `@neondatabase/serverless` + `drizzle-orm/neon-http` (Workers can't do raw TCP `pg` sockets). Caveat: `neon-http` doesn't support real interactive transactions — multi-write atomicity (e.g. user-create + audit-log write) uses `db.batch([...])`, documented once in `packages/db` so later phases don't assume transactions exist.
- **Password hashing:** Argon2id via `hash-wasm` (WASM, no native bindings — works in Workers), tuned to fit the Free plan's 10ms CPU budget. Includes an early spike task to measure real CPU cost before building auth on top of an assumption.
- **Rate limiting:** Cloudflare's native Rate Limiting binding (GA, fixed 60s windows) as a cheap first-line flood guard on `/auth/*`, plus Workers KV for the precise business rule (5 attempts/15min per IP+email). KV is eventually consistent (~60s global propagation) — acceptable for an internal B2B tool, noted as a known limitation rather than a gap to silently ignore.
- **Same-origin API access:** Workers Service Binding — `apps/web`'s Worker calls `apps/api`'s Worker directly (in-process RPC) for requests to `/api/*`. Browser only ever talks to the web origin; zero CORS in production. Hono's CORS middleware stays in the API anyway for local dev (web and api run as separate processes on different ports locally).
- **Service worker:** hand-rolled (~50 lines), not `next-pwa` — avoids fighting the OpenNext build pipeline for a Phase 1 scope this small (cache login + static shell, network-first API).
- **Migrations:** run via `drizzle-kit migrate` as a GitHub Actions CI step immediately before `wrangler deploy` — not as in-Worker startup code (Workers have no persistent process to run that on; every request is a fresh isolate).

## Build sequence

**Stage A — Bootstrap**
1. Amend CLAUDE.md §3/§17 for the OpenNext/Workers adapter change (one-line, product name only) — commit first, since it shapes every config after it.
2. Root workspace scaffolding: `pnpm-workspace.yaml`, root `package.json`, `turbo.json`, `tsconfig.base.json`, `.prettierrc`, `.eslintrc`, `.editorconfig`; minimal `package.json`/`tsconfig.json` in each of `apps/web`, `apps/api`, `packages/db`, `packages/shared`, `packages/ui` so `pnpm install` resolves the workspace graph.
3. CI skeleton (`.github/workflows/ci.yml`) running typecheck/lint/test via Turborepo — in place before real code lands, so every subsequent commit is checked.

**Stage B — Shared primitives**
4. `packages/shared`: Zod validators, shared types/enums (roles, permissions, uniform API error shape). No DB or API dependency — built first so both later layers can import from it.

**Stage C — Data layer & crypto**
5. `packages/db` Drizzle schema: `users`, `roles`, `permissions`, `user_permissions`, `refresh_tokens`, `password_reset_tokens`, `login_history`, `audit_log` — all with `created_at`/`updated_at`, soft-delete `deleted_at` where appropriate, indexes on FKs/email/tokens. First migration generated and committed.
6. Audit-log write helper (used by nearly everything downstream, including login itself).
7. Argon2id hashing helper (`hash-wasm`) + CPU-budget spike + unit tests.
8. JWT helpers (`jose`, HS256, 15min access / 7day refresh) + unit tests.
9. Seed script: 7 roles + default permissions + one Super Admin (`daoodtaxexpertllc@gmail.com`), temp password printed to console.

**Stage D — API core**
10. `apps/api` skeleton: Hono app, `wrangler.toml`, request-id + structured logging + CORS middleware, `GET /health` only.
11. **First live deploy of the bare API** — proves Workers/Neon connectivity before auth logic is built on top of it. (Needs Neon project provisioned — see manual steps below.)
12. Rate limiter (native binding + KV) + JWT auth middleware + permission-check middleware, tested against the real Workers runtime (`@cloudflare/vitest-pool-workers`).
13. Auth endpoints: login, refresh, logout, password-reset-request/confirm, `GET /auth/me`. Password-reset emails console-logged until Resend is wired (Stage G). Tests: happy path + wrong-password path.
14. User management CRUD (Super Admin only, soft-delete, audit-log write on every mutation).

**Stage E — Frontend shell & design system**
15. `apps/web` skeleton via OpenNext: Tailwind (navy `#0B2545` + semantic colors, Inter), shadcn/ui core primitives, layout components (Sidebar, TopBar, PageHeader, EmptyState, LoadingState, ErrorState), mobile bottom-tab-bar + Admin hamburger/drawer.
16. **First live deploy of the bare web app** via OpenNext — proves the adapter pipeline before building on top of it.
17. Auth pages (`/login`, `/forgot-password`, `/reset-password`) via TanStack Query + React Hook Form + shared Zod schemas, wired to live auth endpoints.
18. Authenticated shell: portal switcher, user menu, notifications bell (placeholder), breadcrumbs, dark mode (persisted per user), role-based post-login redirect.
19. Users list + create/edit modal, My Profile (change password, login history).
20. 404/500 pages.

**Stage F — PWA**
21. `manifest.json` + icon set (192/512/apple-touch — placeholders + TODO if real assets aren't provided yet), hand-rolled service worker (login + static cached, network-first API), contextual install prompt, inert `/ship` manifest scaffolding (not activated).

**Stage G — Deployment hardening & docs**
22. GitHub Actions: `drizzle-kit migrate` step wired before `wrangler deploy`.
23. Resend wired for real once the owner's account exists; console-logged reset links replaced with real sends.
24. Full Vitest suite finalized (hash/verify, JWT sign/verify, permission middleware, rate limiter, login integration tests).
25. `docs/phases/phase-01-report.md` + README quick-start — written last, after live verification.

## Manual owner steps (numbered checklists with exact clicks/commands given at the relevant stage, not all at once)

**Early (blocks Stage D/E deploys):**
- Cloudflare API token + Account ID (for GitHub Actions deploys)
- Connect GitHub repo to Cloudflare (Git integration for auto-deploy + PR previews)
- Neon project with `production` + `dev` branches, pooled connection strings
- Paste `DATABASE_URL`, `JWT_SIGNING_KEY`, `JWT_REFRESH_KEY` into Cloudflare Worker secrets (exact names + a generate-command for the keys are given when this step is reached; owner pastes values directly into Cloudflare, never into chat)
- Mirror the same values into a local gitignored `.dev.vars` for local dev

**Later (deferred to Stage G, right before it's needed):**
- Resend account + `RESEND_API_KEY`, `EMAIL_FROM` (sandbox sender is fine to start)
- No custom domain/DNS needed in Phase 1 — default Workers domain is sufficient
- R2, PrintNode, Stripe, QBO, Sentry — out of scope, per CLAUDE.md's own phase-gated credential checklist

## Verification (Phase 1 done-gate, per CLAUDE.md §19 + owner's explicit checklist)

- Live at the production URL, on both desktop Chrome and mobile Safari
- Log in as Super Admin with the seeded temp password; change password successfully
- Create a second user; log in as that user
- Audit log entries exist in the DB for every action above (no viewer UI yet — verified directly)
- Dark mode toggle works and persists
- Site is installable as a PWA on the owner's phone
- Zero TypeScript/lint errors; all CI checks green; business-logic unit tests passing
- No secrets in the repo
- `docs/phases/phase-01-report.md` written
- Nothing pushed to `main` until every item above is verified — work happens in small local commits first, per the owner's explicit instruction
