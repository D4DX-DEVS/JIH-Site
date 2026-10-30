import { Languages } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

/** Says so when a record is shown in the other language because it has no text in the reader's. Renders nothing otherwise. */
export async function LanguageNotice({ lang, className }: { lang: Locale; className?: string }) {
  const { locale, t } = await getI18n();
  if (lang === locale) return null;
  return (
    <p role="note" className={cn("mb-6 flex items-start gap-2.5 rounded-xl bg-gold/10 px-4 py-3 text-sm text-ink ring-1 ring-gold/30", className)}>
      <Languages className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
      <span>{t.notice.onlyIn[lang]}</span>
    </p>
  );
}
