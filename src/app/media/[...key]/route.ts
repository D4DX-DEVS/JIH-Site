import { getMediaBucket } from "@/db/client";

// Media objects are written once under unique keys, so they can be cached aggressively.
const CACHE_CONTROL = "public, max-age=31536000, immutable";
// Uploaded files (including legacy SVGs) must never execute script in our origin.
const MEDIA_CSP = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";

export async function GET(request: Request, ctx: RouteContext<"/media/[...key]">): Promise<Response> {
  const { key: segments } = await ctx.params;
  const key = segments.map((s) => decodeURIComponent(s)).join("/");
  if (!key || key.includes("..") || key.length > 512) return new Response("Not found", { status: 404 });

  const bucket = await getMediaBucket();
  const wantsRange = request.headers.has("range");
  const object = await bucket.get(key, {
    onlyIf: request.headers,
    ...(wantsRange ? { range: request.headers } : {}),
  });
  if (!object) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", CACHE_CONTROL);
  headers.set("Content-Security-Policy", MEDIA_CSP);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Accept-Ranges", "bytes");

  // `onlyIf` precondition matched: R2 returns metadata without a body.
  if (!("body" in object)) return new Response(null, { status: 304, headers });

  if (wantsRange && object.range && "offset" in object.range) {
    const offset = object.range.offset ?? 0;
    const length = object.range.length ?? object.size - offset;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set("Content-Length", String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { headers });
}
