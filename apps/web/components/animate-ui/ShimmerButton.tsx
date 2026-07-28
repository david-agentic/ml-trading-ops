'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Wraps the existing shadcn-based Button primitive and adds a diagonal
 * "shine" sweep that runs on hover. The sweep is a CSS gradient with a
 * transform animation — no motion library needed for this one, keeps the
 * button snappy on every render.
 *
 * The shine is deliberately faint (opacity 0.16 white) and slow (1.1s) —
 * corporate premium, not casino.
 */
type ShimmerButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> & {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  children: React.ReactNode;
};

export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ className, children, ...rest }, ref) => {
    return (
      <Button
        ref={ref}
        // We layer a shimmer overlay via ::after — the actual button classes
        // stay untouched so all existing styling (size, variant, disabled)
        // works exactly as before.
        className={`group relative overflow-hidden ${className ?? ''}`}
        {...rest}
      >
        <span className="relative z-10">{children}</span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.16] to-transparent transition-transform duration-[1100ms] ease-out group-hover:translate-x-full"
        />
      </Button>
    );
  },
);
ShimmerButton.displayName = 'ShimmerButton';
