import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** §15.9 error state: red border + caller renders the 13px danger-700 message below (see Form's FormMessage). */
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // §15.9: 44px height, border-default, radius-sm, bg surface-card, 15px text, 0 14px padding
          'flex h-11 w-full rounded-sm border border-default bg-surface-card px-3.5 text-body ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-tertiary focus-visible:outline-none focus-visible:border-accent-500 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:border-default disabled:bg-surface-muted disabled:text-text-tertiary',
          error && 'border-danger-500 focus-visible:border-danger-500',
          className,
        )}
        aria-invalid={error || undefined}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
