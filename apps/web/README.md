# apps/web

Next.js 14 App Router frontend, deployed to Cloudflare Workers via the OpenNext adapter (see CLAUDE.md §3/§17).

## CI-only build strategy (read this before running anything locally)

This machine's network has repeatedly failed to download `@next/swc-win32-x64-msvc` — Next.js's native Windows compiler binary — sometimes with a fast error, sometimes as a multi-minute hang requiring the process to be killed. The same class of problem previously affected `wrangler`'s `workerd` binary (see `apps/api/vitest.config.ts`).

**The fix:** `pnpm-workspace.yaml` overrides `@next/swc-win32-x64-msvc` to a local no-op stub at `tools/local-stubs/next-swc-win32-x64-msvc/` (its `index.js` throws immediately if actually loaded). This makes `pnpm install` succeed instantly with zero network calls for this package — `typecheck`/`lint`/`test` all work locally since none of them invoke the SWC binary. This override is scoped to one exact package name and is completely inert in CI: CI runs on Linux, which resolves the entirely different `@next/swc-linux-x64-gnu` package and never consults this override. `esbuild`'s own Windows binary (a separate package) is unaffected and continues to install and build normally.

**Consequence:** `next dev` and `next build` **will not work on this machine** — they'll fail as soon as they try to load the stubbed SWC module. This is expected and accepted (see `docs/phases/phase-01-stage-e-plan.md`). All real building/bundling happens in CI (GitHub Actions, Linux runner) via the `Deploy Web` job in `.github/workflows/deploy.yml`, which resolves the real native binary with no issue. The iteration loop for UI changes is: push → CI builds and deploys → refresh the live URL (roughly 2-5 minutes), not a local dev server.

**What still works locally:** `pnpm typecheck`, `pnpm lint`, `pnpm test` — none of these need the SWC binary.

## A pnpm version quirk worth knowing

This pnpm version (11.11.0) **silently ignores** a `"pnpm": { "overrides": {...} }` key in `package.json` (it prints a one-line warning and does nothing) — as of pnpm 10+, overrides and similar settings live in `pnpm-workspace.yaml`'s top-level `overrides:` key instead. If you're used to older pnpm docs/examples putting overrides in `package.json`, that's why it won't appear to do anything on this version.

## Local install command

Just `pnpm install` from the repo root — no special flags needed once the override above is in place (it was needed transiently while diagnosing this, but isn't required going forward).
