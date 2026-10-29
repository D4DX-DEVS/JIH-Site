// Upload validation shared by the admin media API. Pure functions: no I/O.

const MB = 1024 * 1024;

export type MediaKind = "image" | "document" | "other";

interface UploadRule {
  kind: MediaKind;
  extensions: string[];
  maxBytes: number;
  /** Returns true when the leading bytes match the declared type. */
  magic: (b: Uint8Array) => boolean;
}

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

// SVG is intentionally excluded: it can carry script.
export const UPLOAD_RULES: Record<string, UploadRule> = {
  "image/jpeg": { kind: "image", extensions: ["jpg", "jpeg"], maxBytes: 10 * MB, magic: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  "image/png": { kind: "image", extensions: ["png"], maxBytes: 10 * MB, magic: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47]) },
  "image/gif": { kind: "image", extensions: ["gif"], maxBytes: 10 * MB, magic: (b) => startsWith(b, ascii("GIF8")) },
  "image/webp": {
    kind: "image",
    extensions: ["webp"],
    maxBytes: 10 * MB,
    magic: (b) => startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8),
  },
  "image/avif": { kind: "image", extensions: ["avif"], maxBytes: 10 * MB, magic: (b) => startsWith(b, ascii("ftyp"), 4) },
  "application/pdf": { kind: "document", extensions: ["pdf"], maxBytes: 25 * MB, magic: (b) => startsWith(b, ascii("%PDF")) },
};

export const ACCEPT_ATTRIBUTE = Object.entries(UPLOAD_RULES)
  .flatMap(([mime, r]) => [mime, ...r.extensions.map((e) => `.${e}`)])
  .join(",");

export type UploadCheck = { ok: true; kind: MediaKind; extension: string } | { ok: false; error: string };

export function validateUpload(name: string, mimeType: string, size: number, head: Uint8Array): UploadCheck {
  const rule = UPLOAD_RULES[mimeType];
  if (!rule) return { ok: false, error: `File type ${mimeType || "unknown"} is not allowed.` };
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (!rule.extensions.includes(extension)) return { ok: false, error: `Extension .${extension} does not match ${mimeType}.` };
  if (size <= 0) return { ok: false, error: "File is empty." };
  if (size > rule.maxBytes) return { ok: false, error: `File exceeds ${Math.round(rule.maxBytes / MB)} MB.` };
  if (!rule.magic(head)) return { ok: false, error: "File contents do not match its type." };
  return { ok: true, kind: rule.kind, extension };
}

/** Safe object-key filename: lowercase ASCII, digits and dashes. */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${base || "file"}${ext ? `.${ext}` : ""}`;
}
