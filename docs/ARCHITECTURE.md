# Architecture

How the rebuilt jihkerala.org works: what runs where, how a request is handled, where data and files live, and how the admin is secured.

## Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router, TypeScript, React Server Components | Next 16.4.3, React 19 |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` | OpenNext 1.20.14, wrangler 4.155 |
| Database | Cloudflare D1 (SQLite) through Drizzle ORM | `src/db/schema.ts`, `drizzle/migrations/` |
| Files | Cloudflare R2, served by `src/app/media/[...key]/route.ts` | |
| UI | Tailwind CSS 4, shadcn/ui (Radix), Lucide icons, Motion | |
| Forms | react-hook-form + Zod (the same schemas validate on the server) | Zod 4 |
| Tests | Vitest (unit), Playwright + axe-core (end to end) | see `docs/TESTING.md` |

## Request flow on Cloudflare

```
request
  └─ worker.ts                       custom Worker entry (wrangler "main")
       ├─ src/lib/edge-routing.ts    answered here, before React renders:
       │    • signed-out /admin/*    → 307 /admin/login/
       │    • stored legacy redirect → 308 / 307 to the target (D1 `redirects`)
       │    • missing page           → marks the rendered not-found page as 404
       └─ .open-next/worker.js       OpenNext: next.config redirects/headers, then Next.js
            ├─ route handlers        /media/*, /feed/, /sitemap.xml, /robots.txt, /admin/api/media/
            └─ App Router pages      [lang] public pages (ml, en), admin/(panel) CMS
```

The entry fails open: if the D1 lookup errors, or a stored target is not a usable URL, the request goes to Next.js unchanged. Redirects to this site use a relative `Location`. The entry also re-exports OpenNext's Durable Object classes, which the optional shared cache needs.

Why the custom entry exists: on workerd, a `redirect()` or `notFound()` raised during a page render arrives after the response headers have been sent (see "Workers runtime notes" below). The decisions that set a status code search engines rely on are therefore made in the Worker first. `src/lib/edge-routing.ts` mirrors the route table: a stored redirect applies only where Next.js would reach `[lang]/[slug]` (and find no published page or post) or `[lang]/[slug]/[...rest]`. A unit test fails if a new top-level folder appears under `src/app/[lang]` without a rule. English addresses (`/en/…`) follow the same rules on the path after the prefix, and their redirects stay under `/en/`. Under `next dev` / `next start` the same redirects and 404s still happen inside those pages, so behaviour matches.

## Routes

| Path | Source | Notes |
|---|---|---|
| `/` | `[lang]/page.tsx` | Homepage: banner, latest updates, Ameer updates, posters, news, videos, movement figures, organisations, gallery, contact |
| `/<slug>/` | `[lang]/[slug]` | Pages and posts share the root, as on WordPress. Page templates: default, news, hub, leaders, contact |
| `/<a>/<b>/…` | `[lang]/[slug]/[...rest]` | Legacy deep paths: stored redirect or 404 |
| `/category/<path>/`, `/tag/<slug>/` | `[lang]/category`, `[lang]/tag` | Archives, `?page=N` pagination |
| `/leadership/<slug>/` | `[lang]/leadership` | Leader profiles (`/leaders/` is the listing page) |
| `/image-gallery/`, `/image-gallery/<slug>/`, `/image-category/<slug>/` | `[lang]/image-*` | Galleries with a lightbox |
| `/video-gallery/`, `/video-gallery/<slug>/` | `[lang]/video-gallery` | YouTube embeds, loaded on click |
| `/downloads/`, `/search/` | `[lang]/downloads`, `[lang]/search` | |
| `/feed/`, `/sitemap.xml`, `/robots.txt` | route handlers | `robots.txt` blocks crawlers unless `SITE_INDEXABLE=true` |
| `/media/<key>` | route handler | Streams R2 objects, `Cache-Control: public, max-age=31536000, immutable` |
| `/admin/…` | `admin/` | CMS; `/admin/api/media/` takes uploads |

`next.config.ts` keeps WordPress conventions: trailing slashes, `/blog/` → `/news/`, `/ml/*` (TranslatePress) → the Malayalam page, `/wp-content/uploads/*` → `/media/uploads/*`, paged archives → `?page=N`, `/wp-admin` and `/wp-login.php` → admin. The full mapping is in `docs/URL_MAP.md`.

## Languages

Malayalam is the default language and keeps the WordPress addresses; English is the same address under `/en/`. `next.config.ts` rewrites unprefixed public addresses to `/ml/…` (after files and static routes), so both languages render through `src/app/[lang]`, whose `layout.tsx` is the site's root layout (`<html lang>`, fonts, header, footer). The admin has its own root layout in `src/app/admin/layout.tsx`.

- `src/lib/i18n/config.ts`: locales and `localizePath()` (adds or removes `/en`; files, `/admin`, `/feed` and other sites are left alone).
- `src/lib/i18n/server.ts`: `getLocale()` / `getI18n()` read the `[lang]` root param (`next/root-params`) in Server Components. Route handlers and server actions have no root params and take the locale explicitly.
- `src/components/i18n/`: `useI18n()` for Client Components, a `Link` that localizes internal addresses, the ML/EN switcher (in the header's top bar), and the notice shown when a record is not available in the reader's language. Public code imports `Link` from here, never `next/link` directly.
- The header menu (`src/components/site/header-nav-bar.tsx`) shows the full bar from `xl` while its items fit and the menu button otherwise; Malayalam labels run long, so the switch follows the measured width.
- `src/lib/i18n/en.ts` and `ml.ts` (joined in `dictionaries.ts`): every piece of interface text. English is the reference shape, so TypeScript rejects a missing Malayalam key, and a unit test fails when a Malayalam entry is left in English.
- Content is bilingual in the database: plain columns hold Malayalam, `…En` columns English (`title`/`titleEn`, `contentHtml`/`contentHtmlEn` …; settings use `name`/`nameEn` keys). Data getters take the locale and return one language per record plus `lang`, the language actually shown (`src/lib/i18n/content.ts`): the reader's when the record has it, otherwise the other one. A record is never shown with both languages mixed: a title falls back to the other language when the reader's is empty (marked with `lang`), but summaries, excerpts and descriptions only appear in the record's own language (`ownText`). `search_text` covers both languages.
- WordPress stored an English version followed by the Malayalam one in the same body. `scripts/migrate/lib/language.ts` separates them (only bodies shaped as one English run and one Malayalam run; a Malayalam article with an English caption stays whole). The import runs it as its last step; `npm run migrate:split-languages` applies it to a database imported earlier.

## Data

D1 tables (`src/db/schema.ts`): `posts`, `pages`, `categories`, `post_categories`, `tags`, `post_tags`, `media`, `leaders`, `galleries`, `gallery_images`, `gallery_categories`, `videos`, `posters`, `downloads`, `nav_items`, `redirects`, `settings`, `form_submissions`, `activity_log`, `sessions`, `login_attempts`, `migration_items`.

- Slugs are stored decoded (Unicode, NFC). WordPress percent-encoded Malayalam URLs decode to the same string, so old links keep resolving.
- Settings are JSON rows per group (site, seo, contact, social), validated by `src/lib/validation/settings.ts`.
- `migration_items` is the import ledger: one row per WordPress item with outcome and reason. It powers Admin → Activity log → WordPress import and `docs/MIGRATION_REPORT.md`.

Reads: data getters in `src/lib/data/*` use `'use cache'` with `cacheTag` and `cacheLife`. Admin actions call `refreshPublic(...)` (`updateTag`) for the tags they change. Every D1 read sits behind `connection()`, so `next build` never touches a database.

Caching on Workers: the OpenNext config (`open-next.config.ts`) currently uses the default incremental cache, which stores nothing between requests. Each request therefore reads D1 directly, which is correct and fast enough for a site of this size. To share rendered data across requests, add the R2 incremental cache and D1 tag cache described in `docs/DEPLOYMENT.md` → "Optional: shared cache". That needs a new binding on the production account, so it was not done without approval.

## Media (R2)

- Keys keep the WordPress layout: `uploads/YYYY/MM/<file>`. Proportional WordPress size variants (300/768/1024/1536 px) were imported too and are listed on the `media` row, so pages use `srcset` without resizing images at runtime.
- Admin uploads go to `uploads/<year>/<month>/<random>-<safe-name>.<ext>`. The browser makes WebP size variants before upload, and the server checks type, extension, magic bytes and size (`src/lib/upload-rules.ts`). SVG is refused.
- `NEXT_PUBLIC_MEDIA_BASE_URL` can point media at an R2 custom domain later. Empty means `/media/…` through the Worker.
- No storage credentials exist in browser code. Uploads go through the authenticated `/admin/api/media/` route, which writes through the `MEDIA` binding.

## Admin and security

- One administrator, configured with `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` (PBKDF2-SHA256, generated with `npm run admin:hash-password`). No password is stored anywhere.
- Sessions: a random token in an HttpOnly, SameSite=Lax cookie (`jih_admin_session`), Secure in production builds. D1 stores only its SHA-256, with a 12-hour lifetime. Sign-out deletes the row.
- Login is rate limited: 5 failures per IP hash per 15 minutes.
- Authorization: every admin page and server action calls `requireAdmin()`. The Worker's cookie gate only gives signed-out visitors a proper redirect; it is not the security boundary.
- CSRF: server actions use Next's built-in Origin check, and the upload route compares `Origin` with the host the browser addressed.
- Output safety: rich text (posts, pages, leader biographies) is sanitised with `sanitize-html` on import, on save and again when read. URL fields accept only `http(s)` (no `javascript:`). The map embed accepts only Google Maps.
- Admin responses send `X-Robots-Tag: noindex, nofollow`. Every response sends `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy`.
- Metrics on the dashboard are counts from D1. Nothing is estimated or sample data.

Admin modules: dashboard, posts, pages, categories, leaders, galleries, videos, posters, downloads, media library, navigation (header and footer, two levels), redirects, settings & SEO, form submissions, and the activity log (including the WordPress import ledger).

## Workers runtime notes

These steps make Next.js 16.4 + OpenNext 1.20.14 work on workerd. Remove each one when upstream fixes it.

1. **Post-build patch** (`scripts/patch-worker.mjs`, run by `npm run cf:build`). Next 16.4 replaces `setImmediate`/`process.nextTick` with a scheduler that depends on Node's task ordering. On workerd it never drains, and every page render was cancelled ("Worker's code had hung"). The patch skips that installer in the built bundle. The script fails the build if the pattern is missing, so a future release that changes it gets reviewed instead of silently passing. Tracking: opennextjs/opennextjs-cloudflare#1318.
2. **`partialPrefetching: false`** in `next.config.ts`, because runtime prefetches can drop their last stage on workerd until #1318 ships. Links still prefetch the static shell.
3. **Status codes from the Worker entry** (see "Request flow" above). Remaining soft 404s: an unknown slug under `/category/`, `/tag/`, `/leadership/`, `/image-gallery/`, `/image-category/` or `/video-gallery/`, and pagination past the last page. These return 200 with the not-found page and `<meta name="robots" content="noindex">`, so they are not indexed. Under `next start` they are real 404s.
4. `src/instrumentation.ts` logs server render errors to the Workers log (observability is on), so failures leave a stack trace.

## Migration pipeline

`scripts/migrate/`: `extract.mjs` reads the WordPress REST API, `crawl.mjs` fetches public HTML (the Elementor homepage, menus, settings), `download-media.mjs` downloads uploads, `import.ts` loads D1/R2, and `verify.ts` checks the result. Import is idempotent: rows upsert by WordPress id and R2 objects are skipped when the sha256 matches. Remote runs refuse to start without `--yes-i-have-approval`. Results are in `docs/MIGRATION_REPORT.md`.
