import "server-only";
import { inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { media } from "@/db/schema";
import type { MediaRef } from "@/lib/media-url";

export interface PublicMedia extends MediaRef {
  id: number;
  title: string;
  caption: string;
  mimeType: string;
  kind: "image" | "document" | "other";
  sizeBytes: number;
}

const columns = {
  id: media.id,
  r2Key: media.r2Key,
  width: media.width,
  height: media.height,
  altText: media.altText,
  variants: media.variants,
  title: media.title,
  caption: media.caption,
  mimeType: media.mimeType,
  kind: media.kind,
  sizeBytes: media.sizeBytes,
};

export async function getMediaByIds(db: Db, ids: Array<number | null | undefined>): Promise<Map<number, PublicMedia>> {
  const unique = [...new Set(ids.filter((id): id is number => typeof id === "number"))];
  const out = new Map<number, PublicMedia>();
  // D1 allows at most 100 bound parameters per statement.
  for (let i = 0; i < unique.length; i += 90) {
    const rows = await db.select(columns).from(media).where(inArray(media.id, unique.slice(i, i + 90)));
    for (const row of rows) out.set(row.id, row);
  }
  return out;
}

/** Replaces `<key>Id` columns with the resolved media object under `<key>`. */
export async function withMedia<T extends object, K extends string>(
  db: Db,
  rows: T[],
  idKey: keyof T,
  as: K,
): Promise<Array<T & Record<K, PublicMedia | null>>> {
  const map = await getMediaByIds(
    db,
    rows.map((r) => r[idKey] as number | null),
  );
  return rows.map((r) => ({ ...r, [as]: map.get(r[idKey] as number) ?? null }) as T & Record<K, PublicMedia | null>);
}
