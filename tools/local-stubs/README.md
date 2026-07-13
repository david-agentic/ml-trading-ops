# Local stub packages

`next-swc-win32-x64-msvc/` stands in for the real `@next/swc-win32-x64-msvc`
package via the `pnpm.overrides` entry in the root `package.json`.

**Why:** `@next/swc-win32-x64-msvc` is a large native binary that this
machine's network has repeatedly failed to download (timeouts, multi-minute
hangs) — see `apps/web/README.md` for the incident history. Unlike a plain
`--no-optional` flag (which only prunes optional dependencies declared by the
workspace's own `package.json` files, not ones nested inside third-party
packages like `next`), overriding this exact package name is the only
mechanism that reliably stops pnpm from attempting the fetch at all.

**Why it's safe for CI:** this override targets one exact package name,
`@next/swc-win32-x64-msvc`. CI runs on Linux, which resolves the completely
different package `@next/swc-linux-x64-gnu` instead — this override is never
even consulted there. `esbuild`'s own Windows binary (a separate package,
unaffected by this override) continues to install normally.

**Consequence:** `next build` / `next dev` will throw immediately if actually
run on this machine, since the stub's `index.js` throws on load. That's
expected — see the CI-only build strategy in `apps/web/README.md`. Nothing
that only needs TypeScript/ESLint/Vitest (i.e. `pnpm typecheck`/`lint`/`test`)
touches this package at all.
