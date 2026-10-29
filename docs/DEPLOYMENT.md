# Deployment and rollback

Nothing in this guide has been run against the production Cloudflare account. Each step marked **Approval** writes to production or changes what visitors see, so get explicit sign-off before running it. `npm run deploy` deliberately exits with an error so nobody deploys by accident.

## What exists already

`wrangler.production.jsonc` names the existing production resources on the Cloudflare account:

| Binding | Resource | Purpose |
|---|---|---|
| `DB` | D1 database `jih` | Content, settings, sessions, redirects, import ledger |
| `MEDIA` | R2 bucket `jih` | Media originals and size variants (`uploads/YYYY/MM/…`) |
| `ASSETS` | Workers static assets (`.open-next/assets`) | JS, CSS, fonts, brand images |
| `WORKER_SELF_REFERENCE` | the Worker itself | Used by OpenNext |

`wrangler.jsonc` is the local configuration (Miniflare D1/R2 in `.wrangler/state`). Pass `--config wrangler.production.jsonc` to every remote command below. The plain npm scripts default to the local file.

## Configuration (names only)

| Name | Kind | Where it is set | Notes |
|---|---|---|---|
| `ADMIN_EMAIL` | secret | `npx wrangler secret put ADMIN_EMAIL --config wrangler.production.jsonc` | Admin sign-in address |
| `ADMIN_PASSWORD_HASH` | secret | `npx wrangler secret put ADMIN_PASSWORD_HASH --config wrangler.production.jsonc` | Output of `npm run admin:hash-password` (PBKDF2). Never the password itself |
| `SITE_INDEXABLE` | var | `"vars"` in `wrangler.production.jsonc`, or the dashboard | `"true"` only once the site serves jihkerala.org. Anything else makes `robots.txt` block crawlers, which is right for previews |
| `NEXT_PUBLIC_SITE_URL` | build-time | build environment | Canonical origin (`https://jihkerala.org`) used in canonical links, sitemap, RSS and Open Graph. Inlined at build |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | build-time | build environment | Optional R2 custom domain for media. Empty means `/media/…` through the Worker |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | CLI only | shell environment or `wrangler login` | Token needs Workers Scripts, D1 and R2 edit rights. Use the existing token if it is valid; do not mint a replacement |

`env.example` lists the same names with empty values. It is named without the leading dot because `.env*` files are locked in this workspace. The project's existing `.env` was not read or changed. Next.js reads `NEXT_PUBLIC_*` values from the build environment, including that file.

## Steps

1. **Check access** (read-only): `npx wrangler whoami`, `npx wrangler d1 list`, `npx wrangler r2 bucket list`. Confirm that `jih` appears in both lists and that the D1 id matches `wrangler.production.jsonc`.
2. **Schema** (**Approval**): `npx wrangler d1 migrations apply DB --remote --config wrangler.production.jsonc`.
3. **Content and media** (**Approval**): `npm run migrate:import -- --remote --config wrangler.production.jsonc --yes-i-have-approval`. The import is idempotent: it upserts by WordPress id and skips R2 objects whose sha256 already matches. Re-running it does not duplicate anything and does not overwrite admin edits unless `--force` is passed.
4. **Verify** (read-only, but it reads production): `npm run migrate:verify -- --remote --config wrangler.production.jsonc --yes-i-have-approval`. This rewrites `docs/MIGRATION_REPORT.md` with production numbers. Expect the 23 media files that 404 on the WordPress server to be listed as failed.
5. **Secrets** (**Approval**): set `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` as in the table above.
6. **Build**: `npm run cf:build`, with `NEXT_PUBLIC_SITE_URL=https://jihkerala.org` in the environment. Always use the npm script, not `opennextjs-cloudflare build` on its own: the script also applies `scripts/patch-worker.mjs`, without which every page hangs on Workers. Check that the output ends with `patch-worker: skipped Next.js fast setImmediate install for workerd`.
7. **Upload a version without routing traffic to it** (**Approval**): `npx opennextjs-cloudflare upload --config wrangler.production.jsonc`. Open the preview URL it prints.
8. **Test the preview**: `E2E_BASE_URL=<preview URL> npx playwright test tests/e2e/public.spec.ts tests/e2e/seo-routing.spec.ts tests/e2e/responsive-a11y.spec.ts`. The admin specs need test credentials; do not run them with the production password. Then sign in by hand once, upload and delete one image, and check one post, the gallery and the contact form.
9. **Deploy** (**Approval**): `npx opennextjs-cloudflare deploy --config wrangler.production.jsonc`. At this point the Worker answers on its workers.dev address only.
10. **Domain cut-over** (**Approval, changes DNS**): attach `jihkerala.org` (and `www`, redirecting to the apex) as a Workers custom domain, either in the dashboard or with `"routes": [{ "pattern": "jihkerala.org", "custom_domain": true }]`. Keep the WordPress server on Cloudways running until the new site has been checked on the real domain.
11. **Open the site to search engines**: set `SITE_INDEXABLE` to `"true"`, redeploy, confirm that `https://jihkerala.org/robots.txt` allows crawling and lists the sitemap, then submit `/sitemap.xml` in Google Search Console.

## After launch: content fixes that need a person

- Admin → Settings → Contact: the email copied from WordPress uses the staging hostname (`…@wordpress-1683093-6756662.cloudwaysapps.com`). Enter the real address.
- Admin → Settings → Social: the Facebook link from WordPress is broken. Enter the real page URL.
- Admin → Pages → `/medical/`: the body text contains the staging hostname email.
- 56 media items are private on WordPress, and the TranslatePress `/ml/` strings were not exported. Both need a WordPress admin export if they are wanted.

## Rollback

| What | How |
|---|---|
| Worker code | `npx wrangler rollback --config wrangler.production.jsonc` returns to the previous version. `npx wrangler deployments list` shows the history |
| Domain | Remove the Workers custom domain and restore the previous DNS records for Cloudways. WordPress keeps serving because it was never changed |
| D1 data | `npx wrangler d1 time-travel restore jih --timestamp=<before the import> --config wrangler.production.jsonc` (D1 keeps 30 days of history). Note the timestamp before step 3 |
| R2 media | The import only adds objects and never deletes, so a rollback needs no R2 change |

## Optional: shared cache

The default OpenNext cache stores nothing between requests, so every page view reads D1. That works for this site. To cache rendered data across requests and keep the admin's instant updates, all of these need **Approval**:

1. Create an R2 bucket for the cache (for example `jih-opennext-cache`). Bind it as `NEXT_INC_CACHE_R2_BUCKET`, and bind D1 `jih` a second time as `NEXT_TAG_CACHE_D1`.
2. Create the tag table in D1. Its columns (`tag`, `revalidatedAt`, `stale`, `expire`) are defined by `node_modules/@opennextjs/cloudflare/dist/api/overrides/tag-cache/d1-next-tag-cache.js`.
3. In `open-next.config.ts`:
   ```ts
   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
   import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache, tagCache: d1NextTagCache });
   ```
4. Rebuild, run the E2E suite locally, and check that editing a post in the admin shows on the public page straight away.

## Notes

- **Windows**: OpenNext warns that Windows is not fully supported. Builds and the local Worker work on this Windows 11 machine, but a CI build should run on Linux or WSL. `opennextjs-cloudflare preview` can leave `workerd` processes running after it is stopped. If port 8787 stays busy, end them.
- **Workers runtime workarounds**: see `docs/ARCHITECTURE.md` → "Workers runtime notes". When an OpenNext release includes opennextjs/opennextjs-cloudflare#1318, remove `scripts/patch-worker.mjs` from `cf:build`, set `partialPrefetching: true`, and re-run the E2E suite against `npm run preview`.
- **vinext**: Cloudflare now recommends vinext (Next.js API on Vite) for new projects. This project uses OpenNext because it runs the real Next.js 16 build and the brief asked for the App Router. Revisit vinext if the OpenNext workarounds become a burden.
- **npm audit** (production tree, checked 2026-10-29): 4 high and 3 low advisories, all in build and CLI tooling, not in code that runs on the Worker. The high one is a command-injection advisory for the `glob` command-line tool, which reaches the tree through `@node-minify/core` in OpenNext's build step; that tool is never invoked. The low one is `deepmerge` prototype pollution via the `shadcn` CLI registry. `npm audit fix --force` would downgrade OpenNext to 1.20.9, so do not run it. Upgrade OpenNext when a release updates the dependency.
