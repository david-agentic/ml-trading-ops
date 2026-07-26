import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Legacy (kept for existing usages) — see "primary"/"accent" below
        // for the exact Section 15.9 tokens.
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        destructive: 'bg-danger-500 text-white hover:bg-danger-700',
        outline: 'border border-default bg-background hover:bg-surface-muted hover:text-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-surface-muted hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',

        // §15.9
        primary: 'bg-brand-navy-950 text-white hover:bg-brand-navy-900',
        accent: 'bg-accent-500 text-white hover:bg-accent-600',
      },
      size: {
        // Legacy
        default: 'h-10 px-4 text-body',
        icon: 'h-10 w-10',

        // §15.9 (sm/lg renamed here to match spec exactly; "default" above
        // already equals the spec's md: 40px/16px-pad/15px-text)
        sm: 'h-8 px-3 text-label',
        lg: 'h-12 px-5 text-body-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
