// Shared state for the import: D1/R2 bindings via wrangler's platform proxy, source data, ledger.
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { and, eq, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import * as schema from "../../../src/db/schema";

export type Db = DrizzleD1Database<typeof schema>;

export const DATA = path.resolve("migration/data");

export interface ImportOptions {
  remote: boolean;
  force: boolean;
  configPath: string;
}

export function parseArgs(argv: string[]): ImportOptions {
  const configIdx = argv.indexOf("--config");
  return {
    remote: argv.includes("--remote"),
    force: argv.includes("--force"),
    configPath: configIdx >= 0 ? argv[configIdx + 1] : "wrangler.jsonc",
  };
}

export async function connect(opts: ImportOptions) {
  const proxy = await getPlatformProxy<CloudflareEnv>({
    configPath: opts.configPath,
    persist: true,
    remoteBindings: opts.remote,
  });
  const db = drizzle(proxy.env.DB, { schema });
  return { db, bucket: proxy.env.MEDIA, dispose: proxy.dispose };
}

export async function readJson<T>(rel: string): Promise<T> {
  return JSON.parse(await readFile(path.join(DATA, rel), "utf8")) as T;
}

/**
 * A public REST collection (raw/) plus the items only an administrator can see (admin/, written by
 * extract-admin.mjs: drafts and unlisted media), when that extract exists.
 */
export async function readSource<T>(file: string): Promise<T[]> {
  const items = await readJson<T[]>(`raw/${file}`);
  try {
    await access(path.join(DATA, "admin", file));
  } catch {
    return items;
  }
  return [...items, ...(await readJson<T[]>(`admin/${file}`))];
}

export async function readHtml(rel: string): Promise<string | null> {
  const file = path.join(DATA, "html", rel);
  try {
    await access(file);
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

export const nowIso = () => new Date().toISOString();

export interface LedgerEntry {
  sourceType: string;
  sourceId: string | number;
  status: schema.MigrationStatus;
  sourceUrl?: string;
  targetTable?: string;
  targetId?: string | number;
  message?: string;
}

/** Tracks per-item outcomes. Also prints a running tally. */
export class Ledger {
  readonly counts = new Map<string, Record<string, number>>();

  constructor(private readonly db: Db) {}

  async record(e: LedgerEntry): Promise<void> {
    const values = {
      sourceType: e.sourceType,
      sourceId: String(e.sourceId),
      status: e.status,
      sourceUrl: e.sourceUrl ?? "",
      targetTable: e.targetTable ?? "",
      targetId: e.targetId === undefined ? "" : String(e.targetId),
      message: e.message ?? "",
      updatedAt: nowIso(),
    };
    await this.db
      .insert(schema.migrationItems)
      .values(values)
      .onConflictDoUpdate({ target: [schema.migrationItems.sourceType, schema.migrationItems.sourceId], set: values });
    const c = this.counts.get(e.sourceType) ?? {};
    c[e.status] = (c[e.status] ?? 0) + 1;
    this.counts.set(e.sourceType, c);
  }

  /** When the ledger was last written for this source item (null if never imported). */
  async lastImportedAt(sourceType: string, sourceId: string | number): Promise<string | null> {
    const [row] = await this.db
      .select({ updatedAt: schema.migrationItems.updatedAt })
      .from(schema.migrationItems)
      .where(and(eq(schema.migrationItems.sourceType, sourceType), eq(schema.migrationItems.sourceId, String(sourceId))))
      .limit(1);
    return row?.updatedAt ?? null;
  }

  print(): void {
    for (const [type, c] of this.counts) console.log(`  ${type.padEnd(18)} ${JSON.stringify(c)}`);
  }
}

/**
 * True when the target row was edited in the admin after the last import, in which case the
 * import leaves it alone unless --force is passed.
 */
export async function editedSinceImport(
  ledger: Ledger,
  sourceType: string,
  sourceId: string | number,
  rowUpdatedAt: string | undefined,
  force: boolean,
): Promise<boolean> {
  if (force || !rowUpdatedAt) return false;
  const imported = await ledger.lastImportedAt(sourceType, sourceId);
  return !!imported && rowUpdatedAt > imported;
}

export async function tableCount(db: Db, table: SQLiteTable): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(table);
  return row?.n ?? 0;
}
