// Bindings declared in wrangler.jsonc. Written by hand rather than with `wrangler types`
// so that generating types never reads local env files.
interface CloudflareEnv {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  WORKER_SELF_REFERENCE: Fetcher;
}
