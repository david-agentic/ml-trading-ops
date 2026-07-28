'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Card wrapper that rises into place on mount and has a very subtle hover
 * shadow lift. Designed for the auth surfaces — a first impression that
 * feels intentional without being flashy.
 *
 * Deliberately does NOT tilt, glow, or animate on hover beyond shadow.
 * Corporate rule: motion should signal quality, never call attention to itself.
 */
export function RiseCard({
  children,
  className,
  delay = 0.05,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
} & Omit<HTMLMotionProps<'div'>, 'ref'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{
        boxShadow:
          '0 20px 40px -20px rgba(10, 22, 40, 0.18), 0 4px 12px -4px rgba(10, 22, 40, 0.08)',
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
