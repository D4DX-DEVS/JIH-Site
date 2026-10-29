import "server-only";
import { updateTag } from "next/cache";
import { getDb } from "@/db/client";
import { activityLog } from "@/db/schema";

export async function logActivity(actor: string, action: string, entityType: string, entityId: string | number, summary: string): Promise<void> {
  const db = await getDb();
  await db.insert(activityLog).values({ actor, action, entityType, entityId: String(entityId), summary: summary.slice(0, 300) });
}

/** Cache tags read by the public site (see src/lib/data). */
export type PublicTag = "posts" | "pages" | "categories" | "leaders" | "galleries" | "videos" | "posters" | "downloads" | "navigation" | "settings" | "redirects";

/** Refreshes public pages that depend on the changed data. Call after every successful write. */
export function refreshPublic(...tags: Array<PublicTag | `post:${string}` | `page:${string}` | `gallery:${string}`>): void {
  for (const tag of new Set(tags)) updateTag(tag);
}
