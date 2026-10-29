import { z } from "zod";
import { PAGE_SIZES } from "@/lib/pagination";

type SearchParams = Record<string, string | string[] | undefined>;

export interface AdminListParams<S extends string> {
  page: number;
  pageSize: number;
  q: string;
  sort: S;
  order: "asc" | "desc";
  status: string;
}

/**
 * Validates admin listing query params. Sort keys are whitelisted per resource; anything
 * invalid falls back to the default so a hand-edited URL can never reach SQL.
 */
export function parseAdminList<S extends string>(
  sp: SearchParams,
  opts: { sorts: readonly S[]; defaultSort: S; defaultOrder?: "asc" | "desc"; statuses?: readonly string[] },
): AdminListParams<S> {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const size = Number(first(sp.pageSize));
  const sort = first(sp.sort);
  const status = first(sp.status) ?? "";
  return {
    page: z.coerce.number().int().min(1).max(100_000).catch(1).parse(first(sp.page) ?? 1),
    pageSize: (PAGE_SIZES as readonly number[]).includes(size) ? size : 20,
    q: z.string().trim().max(100).catch("").parse(first(sp.q) ?? ""),
    sort: (opts.sorts as readonly string[]).includes(sort ?? "") ? (sort as S) : opts.defaultSort,
    order: first(sp.order) === "asc" ? "asc" : first(sp.order) === "desc" ? "desc" : (opts.defaultOrder ?? "desc"),
    status: opts.statuses?.includes(status) ? status : "",
  };
}
