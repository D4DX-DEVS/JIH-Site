import { z } from "zod";

export const PAGE_SIZES = [10, 20, 50, 100] as const;

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const pageParam = z.coerce.number().int().min(1).max(10_000).catch(1);
const queryParam = z.string().trim().max(100).catch("");

/** Normalises ?page / ?pageSize / ?q from URL search params. Invalid values fall back to defaults. */
export function readListParams(
  searchParams: Record<string, string | string[] | undefined>,
  defaults: { pageSize: number } = { pageSize: 12 },
): { page: number; pageSize: number; q: string } {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const sizeRaw = Number(first(searchParams.pageSize));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(sizeRaw) ? sizeRaw : defaults.pageSize;
  return {
    page: pageParam.parse(first(searchParams.page) ?? 1),
    pageSize,
    q: queryParam.parse(first(searchParams.q) ?? ""),
  };
}

export function paginate<T>(data: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Escapes LIKE wildcards; use with `ESCAPE '\'`. */
export function likePattern(q: string): string {
  return `%${q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
