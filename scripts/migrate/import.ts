#!/usr/bin/env tsx
// Stage 4 of the WordPress migration: load extracted data into D1 and media into R2.
//
//   npm run migrate:import                  # local Miniflare D1/R2 (.wrangler/state)
//   npm run migrate:import -- --force       # also overwrite rows edited in the admin since the last import
//   npm run migrate:import -- --remote --config wrangler.production.jsonc   # production (needs approval)
//
// Idempotent: rows are upserted by WordPress id or natural key, R2 objects are skipped when
// their sha256 matches, and every source item gets one row in migration_items.
import { connect, Ledger, parseArgs, readJson } from "./lib/context";
import { importMedia } from "./lib/media";
import { importPages, importPosts, importTaxonomies } from "./lib/content";
import { importGalleries, importLeaders, importVideos, seedRedirects, seedSettings, seedStructure } from "./lib/collections";
import { importFormEntries } from "./lib/forms";
import { separateStoredLanguages } from "./lib/separate-languages";

const opts = parseArgs(process.argv.slice(2));
if (opts.remote && !process.argv.includes("--yes-i-have-approval")) {
  console.error("Refusing to write to remote D1/R2 without --yes-i-have-approval. See docs/DEPLOYMENT.md.");
  process.exit(1);
}

const { db, bucket, dispose } = await connect(opts);
const ledger = new Ledger(db);
const started = Date.now();

try {
  console.log(`Importing into ${opts.remote ? "REMOTE" : "local"} D1/R2 (config: ${opts.configPath})`);
  const site = await readJson<{ page_on_front: number }>("raw/site.json");

  console.log("media…");
  const media = await importMedia(db, bucket, ledger, opts);
  console.log("taxonomies…");
  const tax = await importTaxonomies(db, ledger);
  console.log("posts…");
  await importPosts(db, ledger, media, tax, opts);
  console.log("pages…");
  await importPages(db, ledger, media, opts, site.page_on_front);
  console.log("leaders, galleries, videos…");
  await importLeaders(db, ledger, media);
  await importGalleries(db, ledger, media);
  await importVideos(db, ledger);
  console.log("structure, settings, redirects…");
  await seedStructure(db, ledger, media);
  await seedSettings(db, ledger, media);
  await seedRedirects(db, ledger, media);
  console.log("form entries…");
  await importFormEntries(db, ledger);
  // WordPress bodies hold an English version followed by the Malayalam one; store them apart.
  console.log("languages…");
  const separated = await separateStoredLanguages(db);
  console.log(`  ${separated.length} records had English moved to their English fields`);

  // Source content deliberately not imported, recorded so nothing disappears silently.
  const extract = await readJson<{ summary: Record<string, { count?: number }> }>("raw/_extract-summary.json");
  const admin = await readJson<{ summary: Record<string, { count?: number }> }>("admin/_admin-extract-summary.json").catch(() => null);
  await ledger.record({ sourceType: "excluded", sourceId: "comments", status: "skipped", message: "39,106 public comments are link spam (sampled); not imported. Comments are closed on the new site." });
  await ledger.record({ sourceType: "excluded", sourceId: "jet-popup", status: "skipped", message: "Elementor popup template (leader card popup); replaced by leader profile pages" });
  await ledger.record({ sourceType: "excluded", sourceId: "users", status: "skipped", message: `${extract.summary.users?.count ?? 0} WordPress users; admin access now uses environment credentials` });
  await ledger.record(
    admin
      ? { sourceType: "excluded", sourceId: "media-private", status: "imported", message: `${admin.summary.media?.count ?? 0} media items not publicly listed were exported with admin access and imported` }
      : { sourceType: "excluded", sourceId: "media-private", status: "unresolved", message: "REST reports 928 media items but only 872 are publicly listable; 56 need WordPress admin access to export" },
  );
  if (admin) await ledger.record({ sourceType: "excluded", sourceId: "image-gallery-13529", status: "skipped", message: "Draft gallery with no images (\"ഹിറാ നഗര്‍ -\"); the published 1998 Hira Nagar gallery holds the photos" });
  await ledger.record({ sourceType: "excluded", sourceId: "translatepress", status: "imported", message: "Content split into Malayalam and English fields (English at /en/); the archived /ml/ copies supplied the Malayalam history page. /ml/* redirects to the Malayalam pages" });

  console.log(`\nDone in ${Math.round((Date.now() - started) / 1000)}s. Ledger:`);
  ledger.print();
} finally {
  await dispose();
}
