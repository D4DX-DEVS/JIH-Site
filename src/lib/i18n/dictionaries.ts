import type { Locale } from "./config";
import { en, type Dictionary } from "./en";
import { ml } from "./ml";

/**
 * Interface text of the public site in both languages. Content (pages, posts, leaders …) comes
 * from the database; everything the templates write themselves comes from en.ts and ml.ts.
 *
 * Malayalam pages keep the interface (section titles, labels, footer …) in English: only the
 * content is Malayalam. ml.ts still supplies the search-engine metadata and the language switch.
 */
export type { Dictionary };

const mlInterface: Dictionary = {
  ...en,
  meta: ml.meta,
  language: { ...en.language, switchTo: "Read this page in English" },
};

export const dictionaries: Record<Locale, Dictionary> = { ml: mlInterface, en };
