'use client';

import { motion } from 'motion/react';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Card wrapper that rises into place on mount and has a very subtle hover
 * shadow lift. Designed for the auth surfaces — a first impression that
 * feels intentional without being flashy.
 *
 * Deliberately does NOT tilt, glow, or animate on hover beyond shadow.
 * Corporate rule: motion should signal quality, never call attention to itself.
 */
type MotionDivProps = ComponentProps<typeof motion.div>;

interface RiseCardProps extends Omit<MotionDivProps, 'children'> {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function RiseCard({ children, className, delay = 0.05, ...rest }: RiseCardProps) {
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
