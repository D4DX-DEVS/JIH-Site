import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "@/components/i18n/link";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

interface LinkPaginationProps {
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  /** Other query params to keep (q, category …). */
  params?: Record<string, string | undefined>;
  label?: string;
}

function hrefFor(basePath: string, page: number, params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

const item = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-all duration-200";
const idle = "border border-border/80 bg-white text-ink hover:-translate-y-0.5 hover:border-navy hover:text-navy hover:shadow-soft";

/** Crawlable pagination for public listings: plain links, page state lives in the URL. */
export async function LinkPagination({ basePath, page, totalPages, total, params = {}, label }: LinkPaginationProps) {
  if (totalPages <= 1) return null;
  const { t } = await getI18n();
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  return (
    <nav aria-label={label ?? t.pagination.label} className="flex flex-col items-center gap-4 border-t border-border/70 pt-8 sm:flex-row sm:justify-between">
      <p className="text-sm text-ink-soft">
        {t.pagination.pageOf(page, totalPages)} · {t.pagination.items(total)}
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link href={hrefFor(basePath, page - 1, params)} rel="prev" className={cn(item, idle, "gap-1 pl-2.5")}>
              <ChevronLeft className="size-4" aria-hidden="true" /> <span className="max-sm:sr-only">{t.pagination.previous}</span>
            </Link>
          ) : (
            <span className={cn(item, "gap-1 border border-transparent pl-2.5 text-ink-soft/50")} aria-disabled="true">
              <ChevronLeft className="size-4" aria-hidden="true" /> <span className="max-sm:sr-only">{t.pagination.previous}</span>
            </span>
          )}
        </li>
        {pages.map((p, i) => (
          <li key={p} className="flex items-center gap-1.5">
            {i > 0 && p - pages[i - 1] > 1 ? (
              <span className="px-1 text-ink-soft" aria-hidden="true">
                …
              </span>
            ) : null}
            {p === page ? (
              <span aria-current="page" className={cn(item, "bg-navy text-white shadow-[0_8px_20px_-10px_rgb(7_30_127/0.8)]")}>
                {p}
              </span>
            ) : (
              <Link href={hrefFor(basePath, p, params)} className={cn(item, idle)} aria-label={t.pagination.page(p)}>
                {p}
              </Link>
            )}
          </li>
        ))}
        <li>
          {page < totalPages ? (
            <Link href={hrefFor(basePath, page + 1, params)} rel="next" className={cn(item, idle, "gap-1 pr-2.5")}>
              <span className="max-sm:sr-only">{t.pagination.next}</span> <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className={cn(item, "gap-1 border border-transparent pr-2.5 text-ink-soft/50")} aria-disabled="true">
              <span className="max-sm:sr-only">{t.pagination.next}</span> <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
