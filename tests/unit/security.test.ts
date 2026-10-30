import { describe, expect, it } from "vitest";
import { hashPassword, isPasswordHash, randomToken, sha256Hex, verifyPassword } from "@/lib/auth/password";
import { safeFileName, validateUpload } from "@/lib/upload-rules";
import { likePattern } from "@/lib/pagination";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).toMatch(/^pbkdf2-sha256:\d+:[^:]+:[^:]+$/);
    expect(hash).not.toContain("correct");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterz", hash)).toBe(false);
  });

  it("salts every hash and rejects malformed stored values", async () => {
    expect(await hashPassword("same password")).not.toBe(await hashPassword("same password"));
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });

  it("tells a generated hash from a plain password pasted into ADMIN_PASSWORD_HASH", async () => {
    expect(isPasswordHash(await hashPassword("correct horse battery"))).toBe(true);
    expect(isPasswordHash("correct horse battery")).toBe(false);
    expect(isPasswordHash("pbkdf2-sha256:100000::")).toBe(false);
    expect(isPasswordHash("pbkdf2-sha256:500000:c2FsdA:aGFzaA")).toBe(false);
    expect(isPasswordHash("")).toBe(false);
  });

  it("makes random tokens and stable digests", async () => {
    expect(randomToken()).not.toBe(randomToken());
    expect(randomToken().length).toBeGreaterThanOrEqual(43);
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("upload validation", () => {
  it("accepts a real PNG and PDF", () => {
    expect(validateUpload("a.png", "image/png", 1000, bytes(0x89, 0x50, 0x4e, 0x47))).toMatchObject({ ok: true, kind: "image" });
    expect(validateUpload("doc.pdf", "application/pdf", 1000, bytes(...ascii("%PDF-1.7")))).toMatchObject({ ok: true, kind: "document" });
  });

  it("rejects SVG, mismatched extensions, spoofed contents and oversize files", () => {
    expect(validateUpload("x.svg", "image/svg+xml", 100, bytes(...ascii("<svg")))).toMatchObject({ ok: false });
    expect(validateUpload("x.php", "image/png", 100, bytes(0x89, 0x50, 0x4e, 0x47))).toMatchObject({ ok: false });
    expect(validateUpload("x.png", "image/png", 100, bytes(...ascii("<?php")))).toMatchObject({ ok: false });
    expect(validateUpload("x.png", "image/png", 11 * 1024 * 1024, bytes(0x89, 0x50, 0x4e, 0x47))).toMatchObject({ ok: false });
    expect(validateUpload("x.png", "image/png", 0, bytes(0x89, 0x50, 0x4e, 0x47))).toMatchObject({ ok: false });
  });

  it("builds safe object names", () => {
    expect(safeFileName("../../Etc/Passwd.PNG")).toBe("etc-passwd.png");
    expect(safeFileName("ജമാഅത്ത്.jpg")).toBe("file.jpg");
  });
});

describe("search patterns", () => {
  it("escapes LIKE wildcards so user input matches literally", () => {
    expect(likePattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });

  // D1 rejects LIKE patterns over 50 bytes ("LIKE or GLOB pattern too complex"); Malayalam is 3 bytes a letter.
  it("keeps long Malayalam queries within D1's 50-byte pattern limit", () => {
    const pattern = likePattern("മലര്‍വാടി ബാലസംഘം");
    expect(new TextEncoder().encode(pattern).length).toBeLessThanOrEqual(50);
    expect(pattern).toBe("%മലര്‍വാടി ബാലസംഘ%");
  });

  it("never cuts an escape sequence in half", () => {
    const pattern = likePattern(`${"a".repeat(47)}%`);
    expect(pattern).toBe(`%${"a".repeat(47)}%`);
    expect(likePattern("a".repeat(30))).toBe(`%${"a".repeat(30)}%`);
  });
});
