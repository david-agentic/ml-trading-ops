import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Minimal config: no incremental cache/ISR usage yet (Phase 1 has no
// data-heavy or revalidating pages). Add KV/R2-backed cache overrides here
// once a page actually needs ISR.
export default defineCloudflareConfig();
