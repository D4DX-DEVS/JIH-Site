import type { Locale } from "./i18n/config";

const dateFormatters: Record<Locale, Record<"long" | "short", Intl.DateTimeFormat>> = {
  en: {
    long: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }),
    short: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }),
  },
  ml: {
    long: new Intl.DateTimeFormat("ml-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }),
    short: new Intl.DateTimeFormat("ml-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }),
  },
};

export function formatDate(iso: string | null | undefined, style: "long" | "short" = "long", locale: Locale = "en"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return dateFormatters[locale][style].format(d);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** Date and time in India Standard Time, e.g. "29 Oct 2026, 4:05 pm". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateTime.format(d);
}
