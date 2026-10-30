#!/usr/bin/env tsx
// Separates Malayalam and English in content that was imported with both languages in one field.
// Plain columns keep Malayalam, `…En` columns get English (see src/db/schema.ts). The import does the
// same for new rows; this updates a database imported before the English columns existed.
//
//   npm run migrate:split-languages                 # local Miniflare D1
//   npm run migrate:split-languages -- --dry-run    # print what would change
//   npm run migrate:split-languages -- --remote --config wrangler.production.jsonc --yes-i-have-approval
//
// Idempotent: a second run finds nothing to move. English an editor already wrote is never replaced.
import { connect, parseArgs } from "./lib/context";
import { separateStoredLanguages } from "./lib/separate-languages";

const opts = parseArgs(process.argv.slice(2));
const dryRun = process.argv.includes("--dry-run");
if (opts.remote && !process.argv.includes("--yes-i-have-approval")) {
  console.error("Refusing to write to remote D1 without --yes-i-have-approval. See docs/DEPLOYMENT.md.");
  process.exit(1);
}

const { db, dispose } = await connect(opts);
try {
  console.log(`${dryRun ? "Dry run on" : "Separating languages in"} ${opts.remote ? "REMOTE" : "local"} D1 (config: ${opts.configPath})`);
  const changes = await separateStoredLanguages(db, { dryRun });
  const byTable = new Map<string, number>();
  for (const c of changes) {
    byTable.set(c.table, (byTable.get(c.table) ?? 0) + 1);
    console.log(`  ${c.table.padEnd(18)} ${c.key.slice(0, 48).padEnd(48)} ${c.fields.join(", ")}`);
  }
  console.log(changes.length ? `\n${dryRun ? "Would update" : "Updated"}: ${[...byTable].map(([t, n]) => `${t} ${n}`).join(", ")}` : "\nNothing to separate.");
  if (!dryRun && changes.length) console.log("Cached pages refresh within a few minutes (cacheLife \"minutes\"), or restart the dev server.");
} finally {
  await dispose();
}
