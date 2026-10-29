# WordPress site audit

Source: https://wordpress-1683093-6756662.cloudwaysapps.com (staging copy of jihkerala.org), audited 2026-10-29 through the public REST API (`/wp-json/wp/v2/*`), the sitemaps and a crawl of every public URL. Raw data is in `migration/data/raw/`, crawled HTML in `migration/data/html/`.

## Platform

- **Theme:** Hello Elementor, with every page built in **Elementor** and **Elementor Pro**, plus the Royal Elementor Addons and WPBits add-ons.
- **Custom content:** **JetEngine** (Crocoblock) provides the `leadership`, `image-gallery` and `video-gallery` post types and the `image-category` taxonomy. **JetPopup** provides one popup, `leader`, used for leader profiles.
- **Other plugins seen in the markup:** TranslatePress (an `/ml/` mirror of every page), Fluent Forms (contact form), Smush Pro (image optimisation), WPFront Scroll Top.
- **Users:** 2 WordPress accounts. They are not migrated; the new admin uses one account defined by environment variables.

## Content inventory

| Type | Count | Notes |
|---|---:|---|
| Posts | 95 | 2018-06-04 to 2026-03-28, mostly Malayalam, with percent-encoded Malayalam slugs |
| Pages | 34 | 2 are WordPress system pages that the new site replaces: `home` (Elementor front page) and `blog` (posts page) |
| Categories | 15 | Most used: `state-news` (65), `ameer-updates` (32), `articles` (11). Seven district categories are empty |
| Tags | 64 | |
| Leaders (`leadership`) | 25 | Profile, photo, role, biography |
| Image galleries | 10 | In 2 `image-category` terms |
| Video galleries | 5 | YouTube links |
| Media | 872 listed publicly | 785 JPEG, 61 PNG, 8 PDF, 4 TIFF, 5 SVG, 1 WebP, 8 font files. The REST API reports 928, so 56 are private and need WordPress admin access to export |
| Popups (`jet-popup`) | 1 | Replaced by leader profile pages |

## URLs

- 182 URLs in the sitemaps. The crawl fetched 187 public URLs (34 pages, 95 posts, 25 leaders, 10 galleries, 5 videos, 15 categories, 3 archives) and **all 187 returned 200**.
- Pages and posts share the root (`/<slug>/`). Custom types use their own prefix (`/leadership/`, `/image-gallery/`, `/video-gallery/`, `/image-category/`).
- WordPress created an attachment page for every upload (`/<attachment-slug>/` or `/<parent>/<attachment-slug>/`). Search engines may have indexed these, so 850 of them redirect to the file itself.
- TranslatePress mirrors every page under `/ml/`. Its translated interface strings are not in the REST API.

## Findings that shaped the rebuild

- **Homepage and menus are Elementor markup,** not structured data. The banner image, menus and site settings were taken from the crawled HTML.
- **The staging hostname leaks into content:** the contact email in site settings, the Facebook link, and the text of the `/medical/` page. These were imported as they are and are listed for an editor to fix (`docs/DEPLOYMENT.md` → "After launch").
- **23 media files return 404 on the source server,** so they cannot be migrated. They are listed in `docs/MIGRATION_REPORT.md`.
- **Image sizes:** WordPress generated 300/768/1024/1536 px variants. They were imported and are used as `srcset`, so the Worker never resizes images.
- **No forms data was migrated:** Fluent Forms entries are not public. New contact messages go to Admin → Submissions.

The migration results are in `docs/MIGRATION_REPORT.md`, and the old-to-new address mapping is in `docs/URL_MAP.md`.
