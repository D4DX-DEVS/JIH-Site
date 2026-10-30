"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZES } from "@/lib/pagination";

interface DataPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Previous/Next, page X of Y, result count and rows-per-page. URL is the source of truth. */
export function DataPagination({ page, pageSize, total, totalPages }: DataPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const go = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) next.set(k, v);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-busy={pending}>
      <p className="text-[13px] text-muted-foreground">
        {total} {total === 1 ? "result" : "results"} · Page {Math.min(page, totalPages)} of {totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Rows per page
          <Select value={String(pageSize)} onValueChange={(v) => go({ pageSize: v, page: "1" })}>
            <SelectTrigger className="h-9 w-20" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button variant="outline" className="h-9" disabled={page <= 1 || pending} onClick={() => go({ page: String(page - 1) })}>
          <ChevronLeft className="size-4" aria-hidden="true" /> Previous
        </Button>
        <Button variant="outline" className="h-9" disabled={page >= totalPages || pending} onClick={() => go({ page: String(page + 1) })}>
          Next <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
