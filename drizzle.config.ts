import { defineConfig } from "drizzle-kit";

// Generates SQL migrations only. They are applied with `wrangler d1 migrations apply`,
// which keeps local (Miniflare) and remote D1 on the same migration history.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
});
