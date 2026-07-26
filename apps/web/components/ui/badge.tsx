import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle, Clock, RefreshCcw, Truck, XCircle } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        success: 'border-transparent bg-success text-white',
        warning: 'border-transparent bg-warning text-white',
        info: 'border-transparent bg-info text-white',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/**
 * §15.9 "Badge (Status — Alternative E style, LOCKED)": icon + text inside a
 * refined chip, not a colored dot. Separate from the legacy Badge/variant
 * above (rather than overloading "variant") so existing plain-chip usages
 * are unaffected — this is specifically for the 6 named business states.
 */
const STATUS_CONFIG = {
  success: { icon: CheckCircle, bg: 'bg-success-100', text: 'text-success-700' },
  pending: { icon: Clock, bg: 'bg-warning-100', text: 'text-warning-700' },
  shipped: { icon: Truck, bg: 'bg-info-100', text: 'text-info-700' },
  cancelled: { icon: XCircle, bg: 'bg-surface-muted', text: 'text-text-secondary' },
  refunded: { icon: RefreshCcw, bg: 'bg-surface-muted', text: 'text-text-secondary' },
  danger: { icon: AlertCircle, bg: 'bg-danger-100', text: 'text-danger-700' },
} as const;

export type BadgeStatus = keyof typeof STATUS_CONFIG;

export interface StatusBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  status: BadgeStatus;
  children: React.ReactNode;
}

function StatusBadge({ status, className, children, ...props }: StatusBadgeProps) {
  const { icon: Icon, bg, text } = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label font-medium',
        bg,
        text,
        className,
      )}
      {...props}
    >
      <Icon size={14} strokeWidth={1.5} />
      {children}
    </span>
  );
}

export { Badge, badgeVariants, StatusBadge };
