import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { categories, media } from "@/db/schema";
import type { PickerMedia } from "@/app/admin/(panel)/media/actions";

const PICKER_COLUMNS = {
  id: media.id, r2Key: media.r2Key, title: media.title, altText: media.altText, mimeType: media.mimeType, kind: media.kind,
  width: media.width, height: media.height, sizeBytes: media.sizeBytes, variants: media.variants, createdAt: media.createdAt,
};

export async function pickerMedia(db: Db, id: number | null | undefined): Promise<PickerMedia | null> {
  if (!id) return null;
  const [row] = await db.select(PICKER_COLUMNS).from(media).where(eq(media.id, id)).limit(1);
  return row ?? null;
}

export async function pickerMediaMap(db: Db, ids: Array<number | null | undefined>): Promise<Map<number, PickerMedia>> {
  const wanted = [...new Set(ids.filter((i): i is number => !!i))];
  const map = new Map<number, PickerMedia>();
  // D1 caps bound parameters per statement at 100.
  for (let i = 0; i < wanted.length; i += 90) {
    const rows = await db.select(PICKER_COLUMNS).from(media).where(inArray(media.id, wanted.slice(i, i + 90)));
    for (const r of rows) map.set(r.id, r);
  }
  return map;
}

/** Categories ordered with children directly after their parent. */
export async function categoryOptions(db: Db): Promise<Array<{ id: number; name: string; parentId: number | null }>> {
  const rows = await db.select({ id: categories.id, name: categories.name, parentId: categories.parentId }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
  const top = rows.filter((r) => !r.parentId);
  return top.flatMap((t) => [t, ...rows.filter((r) => r.parentId === t.id)]).concat(rows.filter((r) => r.parentId && !rows.some((p) => p.id === r.parentId)));
}
