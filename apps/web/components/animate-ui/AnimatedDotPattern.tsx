'use client';

import { motion } from 'motion/react';
import { useId } from 'react';

/**
 * Animated dot-grid pattern for dark backgrounds. Two layers:
 *   1. Static dot grid — always-on texture (very subtle)
 *   2. A single soft spotlight that drifts slowly across the grid, brightening
 *      dots it passes over
 *
 * Corporate-tasteful: no color, no fireworks. Just gentle motion that
 * signals "this is a modern product" without shouting.
 *
 * Use inside a container with a solid dark background (e.g. brand-navy-950).
 */
export function AnimatedDotPattern({
  className,
  dotColor = 'rgba(255, 255, 255, 0.08)',
  spotlightColor = 'rgba(62, 123, 250, 0.35)', // brand accent, transparent
  dotSize = 1.4,
  spacing = 24,
}: {
  className?: string;
  dotColor?: string;
  spotlightColor?: string;
  dotSize?: number;
  spacing?: number;
}) {
  const patternId = useId();
  const maskId = useId();

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}>
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={spacing / 2} cy={spacing / 2} r={dotSize} fill={dotColor} />
          </pattern>
          <radialGradient id={maskId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="70%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Base static dot grid */}
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />

        {/* Slow-drifting spotlight — a radial gradient of the accent color
            that highlights dots inside it. Uses two keyframes over ~18s
            for a corporate-slow drift. */}
        <motion.g
          initial={{ x: '10%', y: '20%' }}
          animate={{
            x: ['10%', '70%', '30%', '10%'],
            y: ['20%', '60%', '80%', '20%'],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ mixBlendMode: 'screen' }}
        >
          <circle cx="0" cy="0" r="220" fill={spotlightColor} filter="blur(60px)" />
        </motion.g>
      </svg>
    </div>
  );
}
