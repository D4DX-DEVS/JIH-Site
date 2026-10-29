#!/usr/bin/env tsx
// Prints a PBKDF2 hash for ADMIN_PASSWORD_HASH. The password is read from stdin without echo,
// so it never lands in shell history:   npm run admin:hash-password
import { createInterface } from "node:readline";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";

async function readHidden(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    // Piped input (e.g. CI): read the first line.
    const rl = createInterface({ input: process.stdin });
    for await (const line of rl) return line;
    return "";
  }
  process.stdout.write(prompt);
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  let value = "";
  return new Promise((resolve) => {
    const onData = (buf: Buffer) => {
      for (const ch of buf.toString("utf8")) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") process.exit(130);
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

const password = await readHidden("New admin password: ");
if (password.length < 12) {
  console.error("Use at least 12 characters.");
  process.exit(1);
}
const hash = await hashPassword(password);
if (!(await verifyPassword(password, hash))) {
  console.error("Self-check failed.");
  process.exit(1);
}
console.log("\nAdd this to your environment (e.g. .env.local for local development, or `wrangler secret put ADMIN_PASSWORD_HASH` for production):\n");
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
