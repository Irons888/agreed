import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Our type scale uses custom names (text-body, text-label …); tell tailwind-merge they are font sizes,
// otherwise it would treat them as colours and drop one of `text-body text-muted`.
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'display-sm', 'title-1', 'title-2', 'title-3', 'body-lg', 'quote', 'body', 'label', 'caption', 'micro'] },
      ],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => merge(clsx(inputs));
