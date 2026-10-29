// Uploads downloaded files to R2 (skipping unchanged objects) and upserts media rows.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { eq } from "drizzle-orm";
import * as schema from "../../../src/db/schema";
import { decodeEntities, htmlToText } from "../../../src/lib/content/sanitize";
import { DATA, editedSinceImport, nowIso, readJson, readSource, type Db, type ImportOptions, type Ledger } from "./context";
import { uploadsKey } from "./parse";

const VARIANT_SIZES = ["medium", "medium_large", "large", "1536x1536"] as const;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp",
  svg: "image/svg+xml", tif: "image/tiff", tiff: "image/tiff", avif: "image/avif", pdf: "application/pdf",
  eot: "application/vnd.ms-fontobject", ttf: "font/ttf", woff: "font/woff", woff2: "font/woff2",
};

export const mimeFor = (key: string) => MIME_BY_EXT[key.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

const kindFor = (mime: string): "image" | "document" | "other" =>
  mime.startsWith("image/") && mime !== "image/tiff" ? "image" : mime === "application/pdf" ? "document" : "other";

interface WpMedia {
  id: number;
  date_gmt: string;
  source_url: string;
  mime_type: string;
  title: { rendered: string };
  alt_text: string;
  caption: { rendered: string };
  media_details?: { width?: number; height?: number; filesize?: number; sizes?: Record<string, { width: number; height: number; source_url: string }> };
}

interface DownloadResult {
  key: string;
  status: string | number;
}

export interface MediaIndex {
  /** R2 key ("uploads/2024/11/pm.jpg") → media row id, for originals and their variants. */
  byKey: Map<string, number>;
  byWpId: Map<number, number>;
  /** Keys that exist in R2. */
  uploaded: Set<string>;
}

const R2_CONCURRENCY = 4;

/** Remote R2 (through the platform proxy) returns occasional HTTP 500s; retry with backoff. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= 5) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}

interface StoredObject {
  sha256: string;
  size: number;
}

async function putObject(bucket: R2Bucket, key: string): Promise<StoredObject | null> {
  const file = path.join(DATA, "media", key);
  let buf: Buffer;
  try {
    buf = await readFile(file);
  } catch {
    return null;
  }
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const head = await withRetry(() => bucket.head(key));
  if (head?.customMetadata?.sha256 !== sha256) {
    await withRetry(() =>
      bucket.put(key, buf, {
        httpMetadata: { contentType: mimeFor(key), cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: { sha256, source: "wordpress" },
      }),
    );
  }
  return { sha256, size: buf.length };
}

export async function importMedia(db: Db, bucket: R2Bucket, ledger: Ledger, opts: ImportOptions): Promise<MediaIndex> {
  const items = await readSource<WpMedia>("media.json");
  const downloads = await readJson<{ results: DownloadResult[] }>("media/_download-report.json");
  const available = new Set(downloads.results.filter((r) => r.status === "downloaded" || r.status === "cached").map((r) => r.key));
  const index: MediaIndex = { byKey: new Map(), byWpId: new Map(), uploaded: new Set() };

  // 1. Every downloaded file goes to R2 so any legacy upload URL keeps resolving.
  const objects = new Map<string, StoredObject>();
  const queue = [...available];
  let n = 0;
  await Promise.all(
    Array.from({ length: R2_CONCURRENCY }, async () => {
      for (let key = queue.shift(); key !== undefined; key = queue.shift()) {
        const object = await putObject(bucket, key);
        if (object) {
          objects.set(key, object);
          index.uploaded.add(key);
        }
        if (++n % 250 === 0) process.stdout.write(`\r  r2 objects ${n}/${available.size}`);
      }
    }),
  );
  console.log(`\r  r2 objects ${n}/${available.size}`);

  // 2. Media-library rows.
  for (const m of items) {
    const key = uploadsKey(m.source_url);
    if (!key || !index.uploaded.has(key)) {
      await ledger.record({ sourceType: "media", sourceId: m.id, status: "failed", sourceUrl: m.source_url, message: "File not available on source server (HTTP 404)" });
      continue;
    }
    const object = objects.get(key)!;
    const variants: schema.MediaVariant[] = [];
    for (const size of VARIANT_SIZES) {
      const v = m.media_details?.sizes?.[size];
      const vk = v && uploadsKey(v.source_url);
      if (v && vk && index.uploaded.has(vk)) variants.push({ width: v.width, height: v.height, key: vk });
    }
    const mime = m.mime_type || mimeFor(key);
    const values = {
      wpId: m.id,
      r2Key: key,
      filename: key.split("/").pop()!,
      mimeType: mime,
      kind: kindFor(mime),
      sizeBytes: object.size,
      width: m.media_details?.width ?? null,
      height: m.media_details?.height ?? null,
      title: decodeEntities(m.title.rendered),
      altText: m.alt_text ?? "",
      caption: htmlToText(m.caption?.rendered ?? ""),
      sha256: object.sha256,
      variants,
      legacyUrl: `/wp-content/${key}`,
      createdAt: `${m.date_gmt}Z`,
      updatedAt: nowIso(),
    };
    const [existing] = await db.select({ id: schema.media.id, updatedAt: schema.media.updatedAt }).from(schema.media).where(eq(schema.media.wpId, m.id));
    let id = existing?.id;
    if (existing && (await editedSinceImport(ledger, "media", m.id, existing.updatedAt, opts.force))) {
      await ledger.record({ sourceType: "media", sourceId: m.id, status: "skipped", targetTable: "media", targetId: id, message: "Edited in admin after import" });
    } else {
      const [row] = await db
        .insert(schema.media)
        .values(values)
        .onConflictDoUpdate({ target: schema.media.wpId, set: values })
        .returning({ id: schema.media.id });
      id = row.id;
      await ledger.record({ sourceType: "media", sourceId: m.id, status: "imported", sourceUrl: m.source_url, targetTable: "media", targetId: id });
    }
    index.byWpId.set(m.id, id!);
    index.byKey.set(key, id!);
    for (const v of variants) index.byKey.set(v.key, id!);
    for (const s of Object.values(m.media_details?.sizes ?? {})) {
      const sk = uploadsKey(s.source_url);
      if (sk) index.byKey.set(sk, id!);
    }
  }
  return index;
}

/**
 * Media row for an upload URL that is not in the media library (e.g. images only referenced
 * from page builder markup). Creates the row on first use.
 */
export async function ensureMediaForUrl(db: Db, index: MediaIndex, url: string | undefined, title = ""): Promise<number | null> {
  const key = uploadsKey(url);
  if (!key) return null;
  const known = index.byKey.get(key) ?? index.byKey.get(key.replace(/-\d+x\d+(?=\.\w+$)/, ""));
  if (known) return known;
  if (!index.uploaded.has(key)) return null;
  const mime = mimeFor(key);
  const values = {
    r2Key: key,
    filename: key.split("/").pop()!,
    mimeType: mime,
    kind: kindFor(mime),
    title,
    legacyUrl: `/wp-content/${key}`,
  };
  const [row] = await db
    .insert(schema.media)
    .values(values)
    .onConflictDoUpdate({ target: schema.media.r2Key, set: { updatedAt: nowIso() } })
    .returning({ id: schema.media.id });
  index.byKey.set(key, row.id);
  return row.id;
}
