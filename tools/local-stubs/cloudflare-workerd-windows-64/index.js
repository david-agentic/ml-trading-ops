// Local no-op stub. See tools/local-stubs/README.md.
// The real workerd binary is only needed for `wrangler dev`/local preview,
// neither of which this project uses locally (deploys happen via `npx
// wrangler@^3` in CI, which resolves the real Linux binary independently).
throw new Error(
  '@cloudflare/workerd-windows-64 is stubbed locally (see tools/local-stubs/README.md). ' +
    'Local wrangler dev/preview is not expected to work on this machine — use CI.',
);
