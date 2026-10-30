# URL map: WordPress → new site

Every public WordPress address either keeps working at the same path or permanently redirects to its replacement. Trailing slashes are kept, as on WordPress.

The site is bilingual. Malayalam, the default, keeps every address below unchanged; `next.config.ts` rewrites them internally to `/ml/…` so they render through `src/app/[lang]`. The English version of any page is the same path under `/en/` (`/history/` → `/en/history/`). Both versions carry `hreflang` alternates and both are in the sitemap. A record with no text in the reader's language is shown in the other one with a notice.

| WordPress address | New address | How | Status |
|---|---|---|---|
| `/` (Elementor front page) | `/` | Rebuilt homepage | 200 |
| `/<post-slug>/` | same | `[lang]/[slug]`, post found by slug (Malayalam slugs decode to the same text) | 200 |
| `/<page-slug>/` | same | `[lang]/[slug]`, page found by slug, rendered with its template | 200 |
| `/blog/` (posts page) | `/news/` | `next.config.ts` redirect | 308 |
| `/news/page/<n>/` | `/news/?page=<n>` | `next.config.ts` redirect | 308 |
| `/category/<path>/` | same | `[lang]/category/[...path]` | 200 |
| `/category/<path>/page/<n>/` | `/category/<path>/?page=<n>` | `next.config.ts` redirect | 308 |
| `/tag/<slug>/` | same | `[lang]/tag/[slug]` | 200 |
| `/author/<name>/` | `/news/` | `next.config.ts` redirect (single author) | 308 |
| `/leadership/` | `/leaders/` | `next.config.ts` redirect | 308 |
| `/leadership/<slug>/` | same | `[lang]/leadership/[slug]` | 200 |
| `/image-gallery/`, `/image-gallery/<slug>/` | same | `[lang]/image-gallery` | 200 |
| `/image-category/<slug>/` | same | `[lang]/image-category/[slug]` | 200 |
| `/video-gallery/`, `/video-gallery/<slug>/` | same | `[lang]/video-gallery` | 200 |
| `/wp-content/uploads/<path>` | `/media/uploads/<path>` | `next.config.ts` redirect; the file is served from R2 | 308 |
| Attachment pages: `/<attachment>/`, `/<parent>/<attachment>/`, `/image-gallery/<gallery>/<attachment>/` … | the file under `/media/uploads/…` | 850 rows in D1 `redirects` (source `migration`), answered by the Worker before rendering | 308 |
| `/ml/` and `/ml/<path>/` (TranslatePress) | `/` and `/<path>/` | `next.config.ts` redirect to the Malayalam page | 308 |
| — | `/en/` and `/en/<path>/` | English version of every public page (new) | 200 |
| `/feed/` | `/feed/` | RSS 2.0 of the latest posts | 200 |
| `/wp-admin/…`, `/wp-login.php` | `/admin/`, `/admin/login/` | `next.config.ts` redirect (temporary) | 307 |
| Anything else | not-found page | `noindex`; 404 status (see note) | 404 |

## New addresses

| Address | What |
|---|---|
| `/news/` | News archive (a page with the "news" template) |
| `/leaders/` | Leadership listing (a page with the "leaders" template) |
| `/downloads/` | Downloadable files managed in Admin → Downloads |
| `/search/?q=` | Site search over posts and pages |
| `/sitemap.xml`, `/robots.txt` | Generated; crawlers are blocked unless `SITE_INDEXABLE=true` |
| `/media/<key>` | Media files from R2 |
| `/admin/` | Content management |

## Managing redirects

Editors add, change and remove redirects in **Admin → Redirects**. The form refuses:

- the homepage;
- addresses that belong to a built-in section;
- single-segment addresses where a page or post already lives;
- self-redirects and duplicates.

"Permanent" is stored as 301 and sent as 308; "Temporary" is stored as 302 and sent as 307.

## Note on 404 status codes

The status codes above were checked against the Worker build (`tests/e2e/seo-routing.spec.ts`). On Cloudflare Workers, a few not-found cases return 200 together with the not-found page and `noindex`, until OpenNext ships staged-render support:

- an unknown slug under a section prefix, such as `/tag/unknown/`;
- a page number past the end of a listing.

Search engines do not index them. See `docs/ARCHITECTURE.md` → "Workers runtime notes".
