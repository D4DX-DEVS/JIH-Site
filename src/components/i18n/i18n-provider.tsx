"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Gives Client Components the page language. Set once by the app/[lang] root layout. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** The interface text and language of the page, for Client Components (Server Components use getI18n). */
export function useI18n(): { locale: Locale; t: Dictionary } {
  const locale = useContext(LocaleContext);
  return { locale, t: dictionaries[locale] };
}
