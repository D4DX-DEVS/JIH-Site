import { getDb, getMediaBucket } from "@/db/client";
import { media, type MediaVariant } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { getAdminSession } from "@/lib/auth/session";
import { randomToken } from "@/lib/auth/password";
import { safeFileName, validateUpload } from "@/lib/upload-rules";

const MAX_VARIANTS = 4;
const MAX_VARIANT_BYTES = 5 * 1024 * 1024;

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function head(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, 16).arrayBuffer());
}

// Same test Next.js applies to server actions: the browser's Origin must match the host it addressed.
// request.url is not used because adapters may rewrite it (the local Worker reports localhost).
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * POST multipart: `file` (required), optional `variant` files (WebP resizes produced in the
 * browser, each with a `variantWidth`/`variantHeight`), `width`, `height`, `title`, `altText`.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await getAdminSession();
  if (!session) return json({ ok: false, error: "Not signed in" }, 401);
  if (!sameOrigin(request)) return json({ ok: false, error: "Cross-site request refused" }, 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Expected multipart form data" }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ ok: false, error: "No file received" }, 400);

  const check = validateUpload(file.name, file.type, file.size, await head(file));
  if (!check.ok) return json({ ok: false, error: check.error }, 422);

  const now = new Date();
  const folder = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const name = safeFileName(file.name);
  const base = `${folder}/${randomToken(4).toLowerCase()}-${name.replace(/\.[^.]+$/, "")}`;
  const key = `${base}.${check.extension}`;
  const bucket = await getMediaBucket();
  const written: string[] = [];

  try {
    // R2 refuses a File's stream ("must have a known length"); the form is already in memory anyway.
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { uploadedBy: session.actor, originalName: file.name.slice(0, 200) },
    });
    written.push(key);

    const variants: MediaVariant[] = [];
    if (check.kind === "image") {
      const files = form.getAll("variant").filter((v): v is File => v instanceof File).slice(0, MAX_VARIANTS);
      const widths = form.getAll("variantWidth").map(Number);
      const heights = form.getAll("variantHeight").map(Number);
      for (const [i, v] of files.entries()) {
        const vCheck = validateUpload(`v.webp`, v.type, v.size, await head(v));
        const w = Math.round(widths[i]);
        const h = Math.round(heights[i]);
        if (!vCheck.ok || v.type !== "image/webp" || v.size > MAX_VARIANT_BYTES || !(w > 0 && w < 5000) || !(h > 0 && h < 10000)) continue;
        const vKey = `${base}-${w}w.webp`;
        await bucket.put(vKey, await v.arrayBuffer(), { httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" } });
        written.push(vKey);
        variants.push({ width: w, height: h, key: vKey });
      }
    }

    const width = Number(form.get("width"));
    const height = Number(form.get("height"));
    const db = await getDb();
    const [row] = await db
      .insert(media)
      .values({
        r2Key: key,
        filename: name,
        mimeType: file.type,
        kind: check.kind,
        sizeBytes: file.size,
        width: width > 0 && width < 20000 ? Math.round(width) : null,
        height: height > 0 && height < 20000 ? Math.round(height) : null,
        title: String(form.get("title") ?? file.name).slice(0, 300),
        altText: String(form.get("altText") ?? "").slice(0, 300),
        variants: variants.sort((a, b) => a.width - b.width),
      })
      .returning();
    await logActivity(session.actor, "upload", "media", row.id, `Uploaded ${name}`);
    return json({ ok: true, media: row });
  } catch (err) {
    // Do not leave orphaned objects behind when the database write fails.
    await Promise.allSettled(written.map((k) => bucket.delete(k)));
    console.error("media upload failed", err);
    return json({ ok: false, error: "Upload failed. Nothing was saved; try again." }, 500);
  }
}
