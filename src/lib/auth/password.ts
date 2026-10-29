// PBKDF2-SHA256 via WebCrypto so the same code runs on Workers and in Node scripts.
// Stored format: pbkdf2-sha256:<iterations>:<salt base64url>:<hash base64url>
// (":" separators avoid `$`, which dotenv files would try to expand.)

// Cloudflare Workers caps PBKDF2 at 100k iterations.
const ITERATIONS = 100_000;
const KEY_BYTES = 32;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2-sha256:${ITERATIONS}:${toBase64Url(salt)}:${toBase64Url(hash)}`;
}

/** True when `stored` has the shape `hashPassword` produces. Catches a plain password pasted into ADMIN_PASSWORD_HASH. */
export function isPasswordHash(stored: string): boolean {
  const [scheme, iterRaw, saltRaw, hashRaw, extra] = stored.split(":");
  const iterations = Number(iterRaw);
  return (
    scheme === "pbkdf2-sha256" && Number.isInteger(iterations) && iterations >= 10_000 && iterations <= ITERATIONS &&
    !!saltRaw && !!hashRaw && extra === undefined
  );
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!isPasswordHash(stored)) return false;
  const [, iterRaw, saltRaw, hashRaw] = stored.split(":");
  const expected = fromBase64Url(hashRaw);
  const actual = await derive(password, fromBase64Url(saltRaw), Number(iterRaw));
  return timingSafeEqual(actual, expected);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}
