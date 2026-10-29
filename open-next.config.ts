import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Data is cached with `use cache` + cacheTag and invalidated with updateTag from admin actions.
// For cross-isolate cache sharing in production, add the R2 incremental cache and D1 tag cache
// overrides described in docs/DEPLOYMENT.md once the production bindings exist.
export default defineCloudflareConfig({});
