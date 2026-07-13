// Local no-op stub. See tools/local-stubs/README.md for why this exists.
// Next.js's native SWC binary for this platform consistently fails to
// download on this machine's network (see apps/web/README.md). Real Next.js
// building/dev-serving happens in CI (Linux), which resolves the real
// @next/swc-linux-x64-gnu package and never touches this stub.
throw new Error(
  '@next/swc-win32-x64-msvc is stubbed locally (see tools/local-stubs/README.md). ' +
    '`next build`/`next dev` are not expected to work on this machine — use CI.',
);
