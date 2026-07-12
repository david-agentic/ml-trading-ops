# Brand assets — expected files

This directory is empty except for this README. No placeholder logos or icons
have been generated — per CLAUDE.md §15, assets are derived from a real source
PNG the owner provides. Once that source file is supplied, each file below
will be produced from it and this README updated to reflect what actually
exists.

## Expected files (per CLAUDE.md §15)

| File | Purpose | Notes |
|---|---|---|
| `logo-dark.svg` | Full logo (icon + wordmark), dark navy version | Used on **light** backgrounds — e.g. light-mode sidebar header, printed documents. Derived from the source PNG; does not exist yet. |
| `logo-light.svg` | Full logo (icon + wordmark), white version | Used on **dark** backgrounds — e.g. the navy login gradient (§15: "Login screen uses full logo on a subtle brand gradient"), dark-mode sidebar header. This is the original lockup — CLAUDE.md describes `logo-dark.svg` as derived *from* this one. |
| `icon-1024.png` | Square icon/mark only (no wordmark) | Source for favicon and PWA install icon generation — see PWA sizes below. |

## Icon vs. full lockup

- **Icon** = the mark alone (no "ML Trading" wordmark) — square, works small. Used for favicons, PWA home-screen icons, browser tabs.
- **Full lockup** = icon + wordmark together. Used for the login screen and anywhere there's enough room to read the business name (sidebar header on desktop, printed picking sheets/invoices per CLAUDE.md §1).

## PWA-specific sizes (derived from `icon-1024.png` when Stage F builds the manifest)

Per CLAUDE.md §15.1 (PWA requirements — installable app icon, iOS Safari compatibility):

| Size | Purpose |
|---|---|
| 192×192 | `manifest.json` standard icon |
| 512×512 | `manifest.json` standard icon (large) |
| 512×512 (maskable) | Android adaptive icon — safe-zone padding so OS-applied shape masks don't clip the mark |
| 180×180 | `apple-touch-icon` (iOS home-screen icon) |
| favicon.ico | Browser tab icon (multi-size .ico, generated alongside the above) |

These are not generated yet — Stage F (PWA manifest + service worker) is the point they get wired into `manifest.json`, but the source files can be derived here as soon as the owner provides the source PNG, independent of when Stage F code lands.

## Status

**Waiting on:** a source PNG from the owner (referenced in CLAUDE.md §15 as "the source PNG" — not yet uploaded to the repo). Once provided, `logo-dark.svg`, `logo-light.svg`, and `icon-1024.png` will be derived from it, and the PWA size set generated from `icon-1024.png`.
