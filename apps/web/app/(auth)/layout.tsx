import type { Metadata } from 'next';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { AnimatedDotPattern } from '@/components/animate-ui/AnimatedDotPattern';
import { BlurFadeIn, BlurFadeInWords } from '@/components/animate-ui/BlurFadeIn';
import { AuthIllustration } from '@/components/brand/AuthIllustration';

export const metadata: Metadata = {
  title: 'MLT Ops',
};

/**
 * §15.10 shared split-layout shell for /login, /forgot-password,
 * /reset-password. Left panel: brand statement + illustration as one
 * vertically-centered composed group (no small corner logo — the brand
 * is carried by the statement itself). Right panel: card, vertically
 * centered.
 *
 * Mobile (< lg): left panel becomes a compact hero band at the top with
 * a small centered logo strip; illustration is hidden (no vertical room).
 *
 * Dark mode: no dark: variants needed — --surface-canvas swaps
 * automatically. Left panel is unchanged in dark mode per spec.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[45%_55%]">
      {/* Left panel — dark navy, animated dot-grid + spotlight background */}
      <div className="relative flex h-[min(220px,28vh)] flex-col items-center justify-center overflow-hidden bg-brand-navy-950 px-6 py-8 lg:h-auto lg:min-h-screen lg:items-stretch lg:px-12 lg:py-16">
        {/* Base radial glow — warms the top-left corner on desktop */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at top left, var(--brand-navy-800) 0%, transparent 60%)',
            opacity: 0.4,
          }}
        />

        {/* Animated dot pattern + drifting accent spotlight */}
        <AnimatedDotPattern />

        {/* Mobile-only logo strip — desktop composition doesn't need a
            small corner logo, the brand statement carries identity */}
        <div className="relative z-10 mb-3 flex justify-center lg:hidden">
          <Image
            src="/brand/logo-full-white.png"
            alt="ML Trading International"
            width={128}
            height={35}
            className="h-8 w-auto"
            priority
          />
        </div>

        {/* Centered composition: statement + tagline + big illustration.
            On desktop this whole group is vertically centered as one unit
            using flex-1 + justify-center. */}
        <div className="relative z-10 flex flex-col items-center gap-3 text-center lg:flex-1 lg:items-start lg:justify-center lg:gap-6 lg:text-left">
          <h2 className="text-h3 text-white lg:text-[3.25rem] lg:leading-[1.05] lg:font-semibold">
            <BlurFadeInWords text="Operations that scale." stagger={0.08} startDelay={0.15} />
          </h2>
          <BlurFadeIn delay={0.55}>
            <p className="max-w-md text-body-sm text-white/70 lg:text-body-lg lg:leading-relaxed">
              The complete B2B operations platform for modern distributors.
            </p>
          </BlurFadeIn>

          {/* Illustration — hidden on mobile (hero band has no room),
              much larger on desktop so it feels present, not floating. */}
          <div className="hidden lg:mt-4 lg:block lg:w-full">
            <BlurFadeIn delay={0.75}>
              <AuthIllustration className="h-auto w-full max-w-[480px]" />
            </BlurFadeIn>
          </div>
        </div>

        {/* Footer — desktop only. Positioned absolutely at bottom so it
            doesn't affect vertical centering of the composition above. */}
        <div className="pointer-events-none absolute bottom-6 left-12 right-12 z-10 hidden text-micro text-white/40 lg:block">
          © 2026 ML Trading International Ltd
        </div>
      </div>

      {/* Right panel — canvas surface, card vertically centered */}
      <div className="flex min-h-[calc(100vh-min(220px,28vh))] flex-1 items-center justify-center bg-surface-canvas px-4 py-10 lg:min-h-screen lg:px-8 lg:py-12">
        {children}
      </div>
    </div>
  );
}
