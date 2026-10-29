"use client";

import type { PickerMedia } from "@/app/admin/(panel)/media/actions";

const VARIANT_WIDTHS = [480, 960, 1600];

interface Variant {
  blob: Blob;
  width: number;
  height: number;
}

async function resize(bitmap: ImageBitmap, width: number): Promise<Variant | null> {
  const height = Math.round((bitmap.height / bitmap.width) * width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  return blob && blob.type === "image/webp" ? { blob, width, height } : null;
}

/**
 * Uploads one file. For images the browser makes WebP size variants first (Workers cannot
 * resize images without a paid service), so the public site can serve a proper srcset.
 */
export async function uploadMedia(file: File, opts: { altText?: string } = {}): Promise<{ ok: true; media: PickerMedia } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("title", file.name.replace(/\.[^.]+$/, ""));
  if (opts.altText) form.append("altText", opts.altText);

  if (file.type.startsWith("image/") && file.type !== "image/gif") {
    try {
      const bitmap = await createImageBitmap(file);
      form.append("width", String(bitmap.width));
      form.append("height", String(bitmap.height));
      for (const w of VARIANT_WIDTHS.filter((w) => w < bitmap.width * 0.9)) {
        const v = await resize(bitmap, w);
        if (!v) continue;
        form.append("variant", new File([v.blob], `v-${w}.webp`, { type: "image/webp" }));
        form.append("variantWidth", String(v.width));
        form.append("variantHeight", String(v.height));
      }
      bitmap.close();
    } catch {
      // Unsupported format for decoding (e.g. some AVIFs): upload the original only.
    }
  }

  try {
    const res = await fetch("/admin/api/media/", { method: "POST", body: form });
    const body = (await res.json().catch(() => null)) as { ok: boolean; error?: string; media?: PickerMedia } | null;
    if (!res.ok || !body?.ok || !body.media) return { ok: false, error: body?.error ?? `Upload failed (${res.status})` };
    return { ok: true, media: body.media };
  } catch {
    return { ok: false, error: "Network error during upload" };
  }
}
