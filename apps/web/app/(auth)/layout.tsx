import type { Metadata } from 'next';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { AuthIllustration } from '@/components/brand/AuthIllustration';

export const metadata: Metadata = {
  title: 'MLT Ops',
};

/**
 * §15.10 shared split-layout shell for /login, /forgot-password,
 * /reset-password. Left panel is fully static (logo, brand statement,
 * illustration, footer) - identical on every auth page. Each page provides
 * only its card content via {children}.
 *
 * Dark mode: no dark: variants needed here - --surface-canvas/--surface-card
 * already swap to --brand-navy-800/--brand-navy-700 under .dark (see
 * globals.css), so bg-surface-canvas/bg-surface-card do the right thing in
 * both modes automatically. The left panel is unchanged in dark mode per
 * spec (already dark).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[45%_55%]">
      {/* Left panel - dark, §15.10. Mobile: hero band, h = min(240px, 30vh). Desktop: full height. */}
      <div className="relative flex h-[min(240px,30vh)] flex-col justify-center overflow-hidden bg-brand-navy-950 px-6 py-8 lg:h-auto lg:justify-between lg:px-12 lg:py-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at top left, var(--brand-navy-800) 0%, transparent 60%)',
            opacity: 0.4,
          }}
        />

        {/* Logo - top-left on desktop, centered on mobile */}
        <div className="relative z-10 hidden lg:block">
          <Image
            src="/brand/logo-full-white.png"
            alt="ML Trading International"
            width={160}
            height={44}
            className="h-10 w-auto"
            priority
          />
        </div>
        <div className="relative z-10 flex justify-center lg:hidden">
          <Image
            src="/brand/logo-full-white.png"
            alt="ML Trading International"
            width={128}
            height={35}
            className="h-8 w-auto"
            priority
          />
        </div>

        {/* Brand statement + illustration - centered group on desktop, condensed on mobile */}
        <div className="relative z-10 mt-4 flex flex-col items-center gap-3 text-center lg:mt-0 lg:flex-1 lg:items-start lg:justify-center lg:gap-5 lg:text-left">
          <h2 className="text-h3 text-white lg:text-h2">Operations that scale.</h2>
          <p className="max-w-xs text-body-sm text-white/70 lg:text-body-lg">
            The complete B2B operations platform for modern distributors.
          </p>
          <div className="hidden lg:block">
            <AuthIllustration className="h-auto w-[260px]" />
          </div>
        </div>

        {/* Footer - desktop only (mobile hero has no room to spare) */}
        <div className="relative z-10 hidden text-micro text-white/40 lg:block">
          © 2026 ML Trading International Ltd
        </div>
      </div>

      {/* Right panel - §15.10 */}
      <div className="flex flex-1 items-center justify-center bg-surface-canvas px-4 py-8 lg:min-h-screen lg:px-8">
        <div className="-mt-6 w-full max-w-[420px] rounded-lg border border-subtle bg-surface-card p-6 shadow-lg lg:mt-0 lg:shadow-md">
          {children}
        </div>
      </div>
    </div>
  );
}
