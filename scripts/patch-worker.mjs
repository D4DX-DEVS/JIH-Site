// Post-build fix for the OpenNext Worker bundle. Run after `opennextjs-cloudflare build`.
//
// Next.js 16.4 replaces setImmediate/process.nextTick with a "fast immediate" scheduler that
// relies on Node's nextTick-before-microtask ordering. workerd implements process.nextTick as a
// microtask, so the scheduler never drains and every App Router page render stalls until the
// runtime cancels it ("Worker's code had hung"). Route handlers are unaffected.
//
// Skipping the install leaves the runtime's native timers in place; pages then render in full
// (checked against `next dev` output). Upstream work: opennextjs/opennextjs-cloudflare#1318.
// When an OpenNext release handles this, the pattern below stops matching and this script fails,
// so the step can be reviewed and removed instead of silently doing nothing.
import { readFileSync, writeFileSync } from "node:fs";

const HANDLER = ".open-next/server-functions/default/handler.mjs";
const MARKER = "/*jih:workerd-skip-fast-immediate*/";
const INSTALL = /function install\(\)\{(?=\{\s*\w*\??\.?\(?"installing fast setImmediate patch")/g;

const code = readFileSync(HANDLER, "utf8");

if (code.includes(MARKER)) {
  console.log("patch-worker: already applied");
  process.exit(0);
}

const matches = code.match(INSTALL)?.length ?? 0;
if (matches !== 1) {
  console.error(
    `patch-worker: expected 1 fast setImmediate installer in ${HANDLER}, found ${matches}.\n` +
      "Next.js or OpenNext changed. Check whether pages still hang under `opennextjs-cloudflare preview` before removing this step.",
  );
  process.exit(1);
}

writeFileSync(HANDLER, code.replace(INSTALL, `function install(){return;${MARKER}`));
console.log("patch-worker: skipped Next.js fast setImmediate install for workerd");
