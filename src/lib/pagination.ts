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

/** D1 rejects longer LIKE patterns with "LIKE or GLOB pattern too complex". */
const LIKE_PATTERN_MAX_BYTES = 50;
const utf8 = new TextEncoder();

/**
 * Escapes LIKE wildcards; use with `ESCAPE '\'`. Malayalam takes 3 bytes a letter, so a query too
 * long for D1 is cut to the prefix that fits: it still finds everything the full query would.
 */
export function likePattern(q: string): string {
  let bytes = 2; // the two %s
  let body = "";
  for (const ch of q.toLowerCase()) {
    const token = ch === "\\" || ch === "%" || ch === "_" ? `\\${ch}` : ch;
    bytes += utf8.encode(token).length;
    if (bytes > LIKE_PATTERN_MAX_BYTES) break;
    body += token;
  }
  return `%${body}%`;
}
