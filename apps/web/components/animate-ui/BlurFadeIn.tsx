'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Word-by-word blur-fade reveal for headings. Corporate-slow (0.6s per
 * word cascade over ~0.05s stagger) — never feels playful. Use once at
 * the top of an auth surface for a premium first-impression.
 *
 * Non-motion fallback: users with prefers-reduced-motion get the final
 * state instantly (no animation) via motion/react's built-in respect for
 * that preference.
 */
export function BlurFadeIn({
  children,
  as: Tag = 'span',
  delay = 0,
  className,
}: {
  children: ReactNode;
  as?: keyof HTMLElementTagNameMap;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 6, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={{ display: Tag === 'span' ? 'inline-block' : 'block' }}
    >
      {children}
    </motion.span>
  );
}

/**
 * Word-by-word variant. Splits the text and staggers each word's fade-in.
 * Good for headlines. Handles whitespace correctly so wrapping still works.
 */
export function BlurFadeInWords({
  text,
  className,
  wordClassName,
  stagger = 0.06,
  startDelay = 0,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  stagger?: number;
  startDelay?: number;
}) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={i}>
          <motion.span
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: 0.7,
              delay: startDelay + i * stagger,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ display: 'inline-block' }}
            className={wordClassName}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && ' '}
        </span>
      ))}
    </span>
  );
}
