"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { localizePath, LOCALE_NAMES, LOCALES, splitLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

/**
 * ML | EN toggle: the same page in the other language. A plain <a>: the two languages have
 * separate root layouts (different <html lang>), so the switch is a full page load anyway.
 * `tone="dark"` sits on the navy top bar.
 */
export function LanguageSwitcher({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const { path } = splitLocale(pathname);
  const dark = tone === "dark";
  return (
    <nav
      aria-label={t.language.label}
      className={cn("inline-flex items-center rounded-full text-sm font-semibold", dark ? "bg-white/10 p-0.5" : "bg-mist p-1", className)}
    >
      <ul className="flex items-center">
        {LOCALES.map((l) => {
          const current = l === locale;
          return (
            <li key={l}>
              <a
                href={localizePath(`${path}${query ? `?${query}` : ""}`, l)}
                hrefLang={l}
                lang={l}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "inline-flex min-w-11 items-center justify-center rounded-full px-3 transition-colors",
                  dark ? "min-h-10 lg:min-h-7" : "min-h-9",
                  current ? (dark ? "bg-white text-navy" : "bg-navy text-white") : dark ? "text-on-navy-soft hover:text-white" : "text-ink hover:text-navy",
                )}
              >
                <span aria-hidden="true">{l === "ml" ? "മ" : "EN"}</span>
                <span className="sr-only">{LOCALE_NAMES[l]}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
