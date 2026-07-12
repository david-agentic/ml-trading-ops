# Phase 1, Stage E — Frontend Shell & Design System (Kickoff Plan)

**Status:** DRAFT — planning only, per owner instruction. Nothing in this document has been built yet. Not to be executed until the owner replies "approved" to this specific plan.

**Context:** Stage D (API core) is live and verified — `https://ml-trading-ops-api-preview.business-portal.workers.dev/health` returns 200, all auth + user-management endpoints are deployed and tested. Stage E builds the first real UI on top of that live API: `apps/web`, currently just an empty stub (`package.json` with no dependencies). This plan covers `docs/phases/phase-01-plan.md`'s Build sequence steps 15–20 (Stage E) and notes where step 21 (Stage F, PWA) can interleave rather than wait until Stage E is fully done.

---

## 1. Sub-tasks, in order

**E1. Next.js scaffold**
`apps/web`: Next.js 14+ App Router, TypeScript strict mode, wired into the existing Turborepo pipeline (`dev`/`build`/`lint`/`typecheck`/`test` scripts matching `apps/api`'s pattern so `pnpm typecheck`/`pnpm lint`/`pnpm test` at the root cover it too).

**E2. OpenNext Cloudflare adapter wiring**
`@opennextjs/cloudflare` config + `apps/web/wrangler.toml` (same preview/production env split pattern as `apps/api/wrangler.toml`, so the naming convention documented in CLAUDE.md §17 extends cleanly — e.g. `ml-trading-ops-web-preview` / `ml-trading-ops-web`). Wires the locked **Workers Service Binding** for same-origin `/api/*` calls to `apps/api` (no CORS in production; Hono's CORS middleware stays for local dev only, per `phase-01-plan.md`'s locked decision).

**E3. First live deploy of the bare web app** (`phase-01-plan.md` step 16 / Task #17)
Deploy an empty shell first — proves the OpenNext→Workers pipeline end-to-end before real UI is built on top of it, same philosophy as the bare-`/health`-first API deploy. Add this deploy job to `.github/workflows/deploy.yml` (currently API-only).
→ *PWA interleave point:* this is the earliest safe point to add the static `manifest.json` + a placeholder icon set (low-risk, no dependency on later pages existing) — see open item on brand assets below.

**E4. Tailwind CSS + typography setup**
Navy `#0B2545` primary + semantic success/warning/danger/info palette, Inter font, per CLAUDE.md §15. Dark-mode CSS variable strategy set up here (implementation approach is a sign-off item below).

**E5. shadcn/ui installation**
Initial component primitives installed (exact list is a sign-off item below).

**E6. Core layout primitives**
`Sidebar`, `TopBar`, `PageHeader`, `EmptyState`, `LoadingState` (skeletons, not spinners, per §15), `ErrorState`; mobile bottom-tab-bar component for Reseller/Shipping/Finance and Admin hamburger+drawer, per §15.1's adaptive-nav rules. Built as shared primitives now even though only Admin-relevant pieces (Users list) get used in Phase 1 — later phases (Reseller/Shipping/Finance portals) reuse them directly.

**E7. Data-fetching & forms wiring**
TanStack Query provider/client setup; React Hook Form + the Zod schemas already built in `packages/shared` (Stage B) — no new schema work, just wiring.

**E8. Auth pages** (`phase-01-plan.md` step 17 / Task #18)
`/login`, `/forgot-password`, `/reset-password`, wired to the already-live API endpoints (`/auth/login`, `/auth/password-reset-request`, `/auth/password-reset-confirm`).
→ *PWA interleave point:* this is exactly when the real service worker (hand-rolled, ~50 lines, per the locked decision) becomes buildable — the §15.1 requirement is "offline shell caches the login screen and static assets," which needs `/login` to exist first. Natural point to move from the E3 manifest stub to the real worker.

**E9. Authenticated shell** (`phase-01-plan.md` step 18 / Task #19)
Portal switcher, user menu, notifications bell (inert placeholder — push notifications are explicitly disabled until Phase 9 per CLAUDE.md §15.1), breadcrumbs, dark-mode toggle + persistence, role-based post-login redirect (using the RBAC data already live in the API).

**E10. Users list + create/edit modal** (`phase-01-plan.md` step 19 / Task #20, first half)
Super Admin only, wired to the already-live `GET/POST/PATCH/DELETE /users` endpoints.

**E11. My Profile page** (`phase-01-plan.md` step 19 / Task #20, second half)
Change password (wired to the already-live `POST /auth/change-password`), login history view (reads the already-populated `login_history` table).

**E12. 404 / 500 error pages** (`phase-01-plan.md` step 20 / Task #21)
Plain-English per §15: "what went wrong, what to do next."
→ *PWA interleave point:* the contextual install prompt (after successful login, on second visit, dismissible/remembered per §15.1) fits naturally here — there's now a real authenticated experience worth prompting installation for.

**E13. iOS install compatibility pass**
`apple-touch-icon`, splash screens, status-bar theming — blocked on real brand assets (see open item below); can be stubbed with placeholders and swapped later without rework if assets aren't ready in time.

Stage G items (real CI migration wiring, Resend email, final Vitest pass, phase report) are **not** in this document's scope — they come after Stage E/F, per the existing plan.

---

## 2. Decisions needing your sign-off before I write code

1. **Exact shadcn/ui component set (E5).** Proposed starter list: Button, Input, Label, Select, Dialog, Sheet, Table, Card, Badge, DropdownMenu, Tabs, Form, Avatar, Separator, Skeleton, Sonner (toast). This covers everything E6/E9/E10/E11 need. I'd add more later as needed rather than front-loading the whole library. Reasonable to just proceed with this list unless you want something specific in or out?

2. **Dark-mode implementation approach (E4/E9).** Recommend `next-themes` — it's the standard pairing with shadcn/ui (their own docs use it), tiny, and fits CLAUDE.md Rule 13's "boring, proven solutions" bar. Alternative would be hand-rolling CSS-variable + localStorage/cookie logic ourselves. One open sub-question either way: `phase-01-plan.md` step 18 says dark mode is "persisted per user" — does that mean **per device** (localStorage, what `next-themes` does out of the box) or **per account** (a DB column on `users`, synced across devices)? The former is simpler and is what I'd default to unless you want the latter.

3. **PWA library choice (E3/E8).** Already locked in `phase-01-plan.md`: hand-rolled service worker (~50 lines), not `next-pwa` — avoids fighting the OpenNext build pipeline. Flagging here just to reconfirm that still stands now that we're actually about to build it, since you asked me to list this as a sign-off item explicitly.

4. **Brand assets — real blocker, not just a preference.** I checked: there are currently **no logo/icon files anywhere in the repo** (`apps/web/public/brand/` doesn't exist yet). CLAUDE.md §15 calls for `logo-dark.svg` to be "produced from the source PNG" and lists `logo-light.svg` and `icon-1024.png` as needed for the login screen, sidebar, and PWA install icon — but no source PNG has been provided yet. I can build E1–E12 with placeholder/text-only branding and swap in real assets later without rework, but E13 (iOS install polish) and the login screen's "full logo on a brand gradient" (§15) will look unfinished until real assets exist. Do you have a source logo file to hand over, or should I proceed with placeholders for now?

5. **Sidebar build approach (E6).** shadcn/ui ships an official "sidebar" block in recent versions that could save real build time — but it's desktop-oriented, and our nav requirements differ sharply per portal (bottom tab bar for Reseller/Shipping/Finance, hamburger+drawer for Admin, per §15.1). My default is to hand-build the layout primitives against our actual adaptive-nav spec rather than adapt a desktop-shaped block — smaller and more predictable than fighting a component that assumes a different layout. Flagging in case you'd rather I evaluate the shadcn block first.

Items 1, 3, and 5 are small/reversible calls I'd normally just decide-and-note per CLAUDE.md's own protocol — listed here because you asked for them explicitly. Item 4 is a genuine external dependency (I can't produce a real logo from nothing). Item 2 has one real fork in it (per-device vs per-account persistence) worth a quick answer.

---

## 3. Not covered here

- Stage F items beyond the two interleave points noted above (full manifest/icon finalization, `/ship` secondary manifest scaffolding) — held for after E12 unless you'd rather pull more of it forward.
- Stage G (CI migrations wiring, Resend, final test pass, phase report) — unchanged, comes after.
