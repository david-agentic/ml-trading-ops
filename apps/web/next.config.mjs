/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Next's default image optimizer needs sharp at runtime. We deliberately
    // denied sharp's postinstall build script (pnpm-workspace.yaml) to avoid
    // its native-binary risk on this machine, and Cloudflare Workers isn't a
    // natural fit for that optimizer anyway (this is the standard setting
    // for Next.js + OpenNext on Cloudflare). Images are pre-sized/optimized
    // at generation time instead (see scripts/generate-brand-assets.cjs).
    unoptimized: true,
  },
};

export default nextConfig;
