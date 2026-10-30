import { beforeEach, describe, expect, it, vi } from "vitest";

// Behaves like the R2 binding: a plain ReadableStream has no length, so put() refuses it.
const stored = new Map<string, number>();
const bucket = {
  put: vi.fn(async (key: string, body: unknown) => {
    if (body instanceof ReadableStream) {
      throw new TypeError("Provided readable stream must have a known length (request/response body or readable half of FixedLengthStream)");
    }
    stored.set(key, (body as ArrayBuffer).byteLength);
  }),
  delete: vi.fn(async (key: string) => void stored.delete(key)),
};
const db = { insert: () => ({ values: (row: object) => ({ returning: async () => [{ id: 1, ...row }] }) }) };

vi.mock("@/db/client", () => ({ getDb: async () => db, getMediaBucket: async () => bucket }));
vi.mock("@/lib/auth/session", () => ({ getAdminSession: async () => ({ actor: "admin@test" }) }));
vi.mock("@/lib/admin/activity", () => ({ logActivity: async () => {} }));

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(60).fill(0)]);
const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ".padEnd(40, "\0"));

function upload(): Request {
  const form = new FormData();
  form.append("file", new File([jpeg], "WhatsApp Image 2026-10-30 at 3.11.55 PM.jpeg", { type: "image/jpeg" }));
  form.append("variant", new File([webp], "v.webp", { type: "image/webp" }));
  form.append("variantWidth", "320");
  form.append("variantHeight", "180");
  return new Request("http://localhost:3000/admin/api/media/", { method: "POST", headers: { origin: "http://localhost:3000" }, body: form });
}

beforeEach(() => {
  stored.clear();
  bucket.put.mockClear();
});

describe("media upload", () => {
  it("stores the original and its resized variants in R2", async () => {
    const { POST } = await import("@/app/admin/api/media/route");
    const res = await POST(upload());

    expect(res.status).toBe(200);
    expect(bucket.put).toHaveBeenCalledTimes(2);
    expect([...stored.values()]).toEqual([jpeg.byteLength, webp.byteLength]);
  });
});
