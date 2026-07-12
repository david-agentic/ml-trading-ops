# Phase 1: Foundation — Report

**Status:** DRAFT — skeleton only, not yet filled in. Do not treat any section below as accurate until this status line is updated.

**This report cannot be finalized until:**
- Manual owner setup (Cloudflare, Neon, GitHub secrets) is complete
- The API and web apps are deployed (Task #12, #17)
- The Argon2id CPU spike is re-measured on the real Workers runtime (not the Node proxy figure currently in code)
- The owner has completed live verification per `docs/phases/phase-01-plan.md`'s Verification section

---

## 1. Summary — what was built

_TODO: one paragraph, plain English, once the phase is actually deployed and verified. Draft bullet list of major pieces to expand from:_
- `packages/shared`, `packages/db`, `apps/api` (auth, RBAC, user CRUD) — built and unit/integration tested locally
- `apps/web` — not yet started (Stage E)
- Live deployment — not yet done

## 2. What to test (owner verification checklist)

_TODO: copy the final state of `docs/phases/phase-01-plan.md`'s "Verification" section here once every item is actually checkable, with pass/fail noted per item._

## 3. Known limitations

_TODO. Candidates already known:_
- `GET /users` is unpaginated (deliberate Phase 1 scope, see CLAUDE.md §5)
- KV-based rate limiting is eventually consistent (~60s global propagation)
- Password-reset emails are console-logged, not actually sent, until Resend is wired (Stage G)
- No custom domain yet — running on the free `*.workers.dev` URL

## 4. Security tradeoffs to revisit

_TODO — this section is a commitment made to the owner during planning, not optional:_
- **Argon2id parameters:** exact chosen values (memory KiB, iterations, parallelism) and the **measured CPU cost on the real Workers runtime** (not the Node-proxy figure currently in `packages/shared/src/crypto/password.ts`'s test) — must be filled in once a real deploy exists to measure against.
- Any others discovered between now and phase close.

## 5. Deviations from plan

_TODO: mirror `docs/phases/phase-01-plan.md`'s "Deviations from plan (discovered mid-build)" section here, updated with final resolution status:_
- KV namespace requirement (not in original setup checklist)
- Native Cloudflare Rate Limiting binding (locked in decisions, dropped from implementation, re-added)

## 6. Manual setup performed by the owner

_TODO: record what was actually done — Cloudflare API token/account ID, KV namespace created, Neon project + connection string, GitHub repo secrets added, custom domain decision (if any). No values, just what was configured and where._

## 7. Live URLs

_TODO once deployed:_
- API preview:
- API production:
- Web preview:
- Web production:

## 8. Outstanding TODOs for the owner

_TODO. Candidates already known:_
- Choose a custom domain (likely UK-focused `.co.uk`) — post-Phase-1, no code changes required to add it later
- Decide whether to upgrade off the Workers Free plan if the real Argon2id CPU measurement doesn't comfortably fit the 10ms budget

## 9. Next phase preview — Phase 2

_TODO: brief pointer to Phase 2 scope (Product Management) per CLAUDE.md §16, once Phase 1 is actually closed out._
