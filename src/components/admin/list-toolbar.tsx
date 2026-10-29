"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ToolbarFilter {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

interface ListToolbarProps {
  searchPlaceholder?: string;
  filters?: ToolbarFilter[];
  sorts?: Array<{ value: string; label: string }>;
  defaultSort?: string;
  /** Order used when the URL has none; must match the page’s parseAdminList default. */
  defaultOrder?: "asc" | "desc";
}

const ALL = "__all";

/** Search (debounced 300 ms), filters and sort, all written to the URL. Any change resets to page 1. */
export function ListToolbar({ searchPlaceholder = "Search", filters = [], sorts = [], defaultSort, defaultOrder = "desc" }: ListToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);

  const update = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    const s = next.toString();
    startTransition(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => update({ q: q.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed query should trigger this
  }, [q]);

  const order = params.get("order") === "asc" ? "asc" : params.get("order") === "desc" ? "desc" : defaultOrder;
  const active = !!params.get("q") || filters.some((f) => params.get(f.name)) || !!params.get("sort");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="h-11 pl-9 sm:h-9" maxLength={100} />
      </div>
      {filters.map((f) => (
        <Select key={f.name} value={params.get(f.name) ?? ALL} onValueChange={(v) => update({ [f.name]: v === ALL ? null : v })}>
          <SelectTrigger className="h-11 w-full sm:h-9 sm:w-44" aria-label={f.label} data-active={!!params.get(f.name)}>
            <SelectValue placeholder={f.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All {f.label.toLowerCase()}</SelectItem>
            {f.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {sorts.length ? (
        <div className="flex gap-2">
          <Select value={params.get("sort") ?? defaultSort ?? sorts[0].value} onValueChange={(v) => update({ sort: v })}>
            <SelectTrigger className="h-11 w-full sm:h-9 sm:w-40" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sorts.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  Sort: {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 sm:size-9"
            onClick={() => update({ order: order === "asc" ? "desc" : "asc" })}
            aria-label={order === "asc" ? "Ascending; switch to descending" : "Descending; switch to ascending"}
          >
            {order === "asc" ? <ArrowUpNarrowWide className="size-4" aria-hidden="true" /> : <ArrowDownWideNarrow className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      ) : null}
      {active ? (
        <Button
          type="button"
          variant="ghost"
          className="h-11 sm:h-9"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
        >
          <X className="size-4" aria-hidden="true" /> Clear filters
        </Button>
      ) : null}
      {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Updating" /> : null}
    </div>
  );
}
