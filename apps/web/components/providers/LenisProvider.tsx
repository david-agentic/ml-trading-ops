'use client';

import Lenis from 'lenis';
import { useEffect, type ReactNode } from 'react';

/**
 * Global smooth-scroll layer. Corporate-tasteful settings — no scrolljack,
 * no bounce, just a gentle ease-out on wheel/trackpad scrolls. Falls back
 * to native scrolling on touch devices (users expect their finger to move
 * the page 1:1).
 *
 * lenis is initialized on the client only. When it's disabled (touch
 * devices, reduced-motion preference) it does nothing and the browser's
 * native scroll takes over.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Respect users who've asked for reduced motion.
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.1, // seconds — subtle, not floaty
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1, // no smoothing on touch — feels wrong on phones
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
