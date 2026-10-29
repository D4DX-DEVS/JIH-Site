#!/usr/bin/env tsx
// Replaces a plain password in ADMIN_PASSWORD_HASH with its PBKDF2 hash, in place, so the same password
// signs in. Nothing secret is printed:   npm run admin:hash-env-password [-- path/to/.env]
import { readFileSync, writeFileSync } from "node:fs";
import { hashPassword, isPasswordHash, verifyPassword } from "../src/lib/auth/password";

const file = process.argv[2] ?? ".env";
const text = readFileSync(file, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
const lines = text.split(/\r?\n/);
const index = lines.findIndex((line) => /^\s*ADMIN_PASSWORD_HASH\s*=/.test(line));
if (index === -1) {
  console.error(`No ADMIN_PASSWORD_HASH line in ${file}.`);
  process.exit(1);
}

const raw = lines[index].slice(lines[index].indexOf("=") + 1).trim();
const password = /^(["']).*\1$/.test(raw) ? raw.slice(1, -1) : raw;
if (isPasswordHash(password)) {
  console.log("ADMIN_PASSWORD_HASH is already a hash. Nothing changed.");
  process.exit(0);
}
if (password.length < 12) {
  console.error("The password in ADMIN_PASSWORD_HASH is shorter than 12 characters. Put a longer one there and run this again.");
  process.exit(1);
}

const hash = await hashPassword(password);
if (!(await verifyPassword(password, hash))) {
  console.error("Self-check failed.");
  process.exit(1);
}
lines[index] = `ADMIN_PASSWORD_HASH=${hash}`;
writeFileSync(file, lines.join(eol));
console.log(`Replaced the plain password in ${file} with its hash. Sign in with the same password.`);
