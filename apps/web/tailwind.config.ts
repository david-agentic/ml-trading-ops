import type { Config } from 'tailwindcss';

// Two token generations coexist here, both wired to CSS variables in
// app/globals.css:
// - "Legacy" (commit 6f654b8): border/input/ring/background/foreground/
//   primary/secondary/destructive/muted/accent/popover/card/success/warning/
//   info as flat or DEFAULT+foreground pairs. Still used by components not
//   yet migrated to the new system (Task 4 migrates Button/Input/Card/Badge
//   first).
// - "Design system" (CLAUDE.md §15, rewritten): brand-navy/accent (extended
//   with numeric shades)/surface/text/border (extended)/success/warning/
//   danger/info (extended with numeric shades), plus typography, shadow, and
//   motion scales.
//
// Note on borderRadius/boxShadow "sm"/"md"/"lg": these keys are overridden to
// the new §15.5 values rather than kept alongside the legacy --radius calc.
// This changes existing rounded-*/shadow-* usages workspace-wide by a few px
// / slightly softer shadows — a deliberate, harmless refinement consistent
// with §15.11 ("every future page" uses these same tokens), not a breaking
// change requiring a parallel key set.
//
// Note on spacing/duration: Tailwind's built-in numeric scales already match
// §15.4's --space-N and §15.6's --duration-* values exactly in px/ms (e.g.
// `p-6` is already 24px = --space-6; `duration-200` is already 200ms =
// --duration-base) — no override needed there. Named duration aliases are
// added below purely for readability where the token name reads better than
// the raw number.
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        // Legacy
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          default: 'var(--border-default)',
          strong: 'var(--border-strong)',
          dark: 'var(--border-dark)',
        },
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },

        // Design system (§15.2) — accent/success/warning/info extend their
        // legacy flat-color counterparts with numeric shades rather than
        // colliding with them.
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
          50: 'var(--accent-50)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
        },
        success: {
          DEFAULT: 'var(--success)',
          100: 'var(--success-100)',
          500: 'var(--success-500)',
          700: 'var(--success-700)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          100: 'var(--warning-100)',
          500: 'var(--warning-500)',
          700: 'var(--warning-700)',
        },
        info: {
          DEFAULT: 'var(--info)',
          100: 'var(--info-100)',
          500: 'var(--info-500)',
          700: 'var(--info-700)',
        },
        danger: {
          100: 'var(--danger-100)',
          500: 'var(--danger-500)',
          700: 'var(--danger-700)',
        },
        'brand-navy': {
          950: 'var(--brand-navy-950)',
          900: 'var(--brand-navy-900)',
          800: 'var(--brand-navy-800)',
          700: 'var(--brand-navy-700)',
          500: 'var(--brand-navy-500)',
        },
        surface: {
          canvas: 'var(--surface-canvas)',
          card: 'var(--surface-card)',
          muted: 'var(--surface-muted)',
          hover: 'var(--surface-hover)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        focus: 'var(--shadow-focus)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['32px', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        h1: ['28px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        h2: ['24px', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        h3: ['18px', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        'body-lg': ['16px', { lineHeight: '1.55' }],
        body: ['15px', { lineHeight: '1.5' }],
        'body-sm': ['14px', { lineHeight: '1.5' }],
        label: ['13px', { lineHeight: '1.4', letterSpacing: '0.02em' }],
        eyebrow: ['12px', { lineHeight: '1.4', letterSpacing: '0.08em' }],
        micro: ['12px', { lineHeight: '1.4' }],
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
