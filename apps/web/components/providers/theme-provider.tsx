'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

// Per-device persistence (localStorage) for Phase 1 — per-account sync is a
// Phase 4 item (owner-approved, see docs/phases/phase-01-stage-e-plan.md).
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" {...props}>
      {children}
    </NextThemesProvider>
  );
}
