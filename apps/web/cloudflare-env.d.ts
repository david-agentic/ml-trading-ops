// Matches the bindings declared in wrangler.toml. Not yet consumed by any
// route (nothing calls the API until E7/E8) — typed ahead of time so that
// code is ready when it's needed.
interface CloudflareEnv {
  ASSETS: Fetcher;
  API: Fetcher;
}
