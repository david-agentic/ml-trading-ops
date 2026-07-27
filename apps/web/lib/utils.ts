import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Plain twMerge() didn't recognize CLAUDE.md §15.3's custom fontSize scale
 * (text-display/h1/h2/h3/body-lg/body/body-sm/label/eyebrow/micro, defined
 * in tailwind.config.ts) and folded them into the same conflict group as
 * text-color utilities - e.g. `text-white text-body-lg` on the primary
 * Button variant silently dropped text-white, leaving button text the same
 * color as its own navy background. Registering these under the font-size
 * classGroup (the same shape Tailwind's own default sizes use internally)
 * keeps them a separate group from text-color so both survive together.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'h1', 'h2', 'h3', 'body-lg', 'body', 'body-sm', 'label', 'eyebrow', 'micro'] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
