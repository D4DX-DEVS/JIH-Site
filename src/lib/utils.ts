import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The theme's type steps (text-step-0 … text-step-4) are font sizes. Without this,
// tailwind-merge reads them as colours and drops them when a text colour follows.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["step-0", "step-1", "step-2", "step-3", "step-4"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
