import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = DrizzleD1Database<typeof schema>;

// Where OpenNext keeps the context (see @opennextjs/cloudflare/dist/api/cloudflare-context.js).
const CONTEXT_KEY = Symbol.for("__cloudflare-context__");

export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  if (process.env.NODE_ENV === "production") return env;
  // In `next dev` the bindings are Miniflare proxies created once at startup. When Miniflare restarts
  // (a burst of .env reloads does it) they become "poisoned stubs" and every query throws until the
  // server restarts. Touching a property is enough to detect it; dropping the context makes OpenNext
  // build a fresh one from wrangler on the next call.
  try {
    void env.DB.prepare;
    return env;
  } catch {
    delete (globalThis as Record<symbol, unknown>)[CONTEXT_KEY];
    return (await getCloudflareContext({ async: true })).env;
  }
}

export async function getDb(): Promise<Db> {
  const env = await getEnv();
  return drizzle(env.DB, { schema });
}

export async function getMediaBucket(): Promise<R2Bucket> {
  return (await getEnv()).MEDIA;
}
