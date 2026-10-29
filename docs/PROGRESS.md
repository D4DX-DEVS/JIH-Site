# Rebuild progress: jihkerala (WordPress → Next.js + Cloudflare D1/R2)

Last updated: 2026-10-29

Status key: **Done** = built and checked locally · **Needs approval** = ready, but it writes to the production Cloudflare account or DNS · **Manual** = needs a person (content decision or WordPress admin access).

## Phase status

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 1 | Inspect repository and env config | Done | Folder held only `.env`. Its contents were not read and it was not modified. Variable names are in `env.example` |
| 2 | Audit WordPress site | Done | `docs/AUDIT.md`. REST API, sitemaps and every public URL crawled (187/187 returned 200) |
| 3 | Document content types and URLs | Done | `docs/AUDIT.md`, `docs/URL_MAP.md` (every redirect in the map checked against the Worker build) |
| 4 | Database and storage design | Done | `src/db/schema.ts`, `drizzle/migrations/0000_init.sql`, `docs/ARCHITECTURE.md` |
| 5 | Design system and public site | Done | Modern institutional design: navy `#071E7F`, maroon `#7E1146`, gold accent, a warm ivory ground in place of grey, and a lattice texture. Pages: homepage (11 sections), news, articles, pages, leaders, galleries, videos, downloads, search, contact, 404. Motion with reduced-motion fallbacks. The homepage banner shows uncropped with no text over it |
| 6 | Admin CMS | Done | Dashboard with real counts; posts, pages, categories, leaders, galleries, videos, posters, downloads, media library, navigation, redirects, settings & SEO, submissions, activity log (with the WordPress import ledger) |
| 7 | Migrate content and media | Done (local D1/R2) | `npm run migrate:*`. The production import needs approval (`docs/DEPLOYMENT.md` step 3) |
| 7b | Full archive of the WordPress site | Done (2026-10-29) | `migration/archive/` (gitignored): all public REST data including comments, 904 HTML pages including 448 `/ml/` pages, theme CSS/JS/fonts, 42 full-page screenshots. Made with `scripts/migrate/archive.mjs` before the source server goes offline. See `migration/archive/README.md` |
| 8 | Verify migration completeness | Done (local) | `docs/MIGRATION_REPORT.md`: posts 95/95, pages 32 (+2 replaced), media 849 of 872 (23 missing at source), 850 redirects with 0 broken |
| 9 | Automated tests and responsive checks | Done | `docs/TESTING.md`: types, lint, 41 unit, 42 end-to-end (status codes, redirects, admin security, upload, responsive at 375/768/1280, animation visibility, axe AA), all passing on the Worker build. Found and fixed: uploads refused on Workers, and sections invisible with reduced motion |
| 10 | Deployment and rollback plan | Done (written) / Needs approval (execution) | `docs/DEPLOYMENT.md` |

## Cloudflare Workers compatibility (fixed 2026-10-29)

Every page returned 500 under the local Workers runtime ("Worker's code had hung"), while the same build worked under `next start`. The cause: Next.js 16.4 installs a `setImmediate`/`nextTick` scheduler that never drains on workerd. Fixes:

- `scripts/patch-worker.mjs` runs after the OpenNext build. It skips that scheduler, and fails the build loudly if a future version changes it.
- `worker.ts` + `src/lib/edge-routing.ts` answer stored legacy redirects (308), signed-out admin requests (307) and missing pages (404) before React renders. On workerd those status codes would otherwise arrive after a 200 had already been sent.
- `partialPrefetching: false` until OpenNext releases its staged-render support (opennextjs/opennextjs-cloudflare#1318).

Known limitation: an unknown slug under a section prefix, such as `/tag/unknown/`, returns 200 on Workers, with the not-found page and `noindex`. See `docs/ARCHITECTURE.md`.

## Needs approval (production Cloudflare account)

1. Apply the D1 schema, import content and media, and run verify against D1 `jih` / R2 `jih`.
2. Set the `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` secrets, and set `SITE_INDEXABLE` at go-live.
3. Upload a preview version, test it, deploy, and attach `jihkerala.org` (a DNS change).
4. Optional shared cache (an R2 cache bucket and a D1 tag table).

## Manual (needs a person)

- Correct the contact email and the Facebook link in Admin → Settings. Both came from WordPress with the staging hostname.
- Correct the staging email in the body of the `/medical/` page.
- 56 private WordPress media items and the TranslatePress `/ml/` strings need a WordPress admin export, if they are wanted.
- 23 media files are missing on the WordPress server itself. Re-upload them if the originals exist elsewhere.

## Decisions

- **Adapter:** `@opennextjs/cloudflare` runs the real Next.js 16 build on Workers. Cloudflare's current guide recommends *vinext* for new projects. vinext reimplements the Next.js API on Vite, and the brief asks for Next.js App Router, so OpenNext was chosen. Migrating later is possible.
- **Rendering:** `cacheComponents`. Data getters use `'use cache'` + `cacheTag`, and admin actions call `updateTag`. Every D1 read happens at request time behind `connection()`, so `next build` never touches a database.
- **Status codes on Workers:** decided in the Worker entry for redirects, the admin gate and missing pages (see above). Under `next dev`/`next start` the pages themselves return the same codes.
- **Media:** WordPress uploads keep their paths in R2 (`uploads/YYYY/MM/file`). The proportional WordPress size variants (300/768/1024/1536) were migrated and are served as `srcset`, which avoids runtime image resizing on Workers.
- **Search:** `LIKE` on a lowercased `search_text` column. It handles Malayalam correctly at the current size (≈130 documents). FTS5 trigram is the upgrade path.
- **Auth:** a single administrator from environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, PBKDF2-SHA256). Sessions are stored hashed in D1. Login is rate limited per IP.
