/**
 * Decisions the Worker makes before a request reaches Next.js (see worker.ts).
 *
 * On workerd, a redirect() or notFound() thrown while a page renders lands after the response
 * headers have gone out, so visitors get a 200 and a client-side redirect. Legacy redirects and the
 * admin sign-in gate set the status code search engines and browsers act on, so the Worker answers
 * them first, and marks the not-found renders of those routes as 404s. The rules mirror the app routes:
 * a stored redirect applies only where Next.js would have reached `[lang]/[slug]` (and found no
 * content) or `[lang]/[slug]/[...rest]`; with no redirect either, those pages can only render not-found.
 * English addresses (/en/…) follow the same rules on the path after the prefix, and their redirects
 * stay in English. Under `next dev` / `next start` the same redirects still run inside those pages.
 */
import { ADMIN_SESSION_COOKIE } from "./auth/cookie";
import { EN_PREFIX, localizePath, type Locale } from "./i18n/config";
import { decodeSegment } from "./slug";

/** Files served at the root by metadata routes (src/app/robots.ts, sitemap.ts, icon.png, apple-icon.png). */
export const ROOT_FILES = ["robots.txt", "sitemap.xml", "icon.png", "apple-icon.png"];
/** First segments served at every depth, the bare section included, by a route or a next.config redirect. */
export const ANY_DEPTH_SECTIONS = ["_next", "admin", "cdn-cgi", "ml", "wp-admin"];
/** Required catch-alls (`[...path]`): taken from two segments down; the bare section falls to `[slug]`. */
export const CATCH_ALL_SECTIONS = ["category", "media"];
/** Single-segment addresses served by a route or a next.config redirect. */
export const STATIC_SECTIONS = ["blog", "downloads", "feed", "image-gallery", "leadership", "search", "video-gallery"];
/** Sections with a `[slug]` child route (or a `/<section>/:name` redirect), so two-segment addresses under them are taken. */
export const SLUG_SECTIONS = ["author", "image-category", "image-gallery", "leadership", "tag", "video-gallery"];

export interface RedirectScope {
  /** Normalised path as stored in redirects.from_path. */
  path: string;
  /** Set for single-segment paths: published content with this slug wins over a redirect. */
  slug: string | null;
}

/** Where a stored redirect could apply to this URL path, or null when a built-in route serves it. */
export function redirectScope(pathname: string): RedirectScope | null {
  const segments = pathname.split("/").filter(Boolean).map(decodeSegment);
  const depth = segments.length;
  if (depth === 0) return null;
  const [first, second, third] = segments;
  if (depth === 1 && (ROOT_FILES.includes(first) || STATIC_SECTIONS.includes(first))) return null;
  if (ANY_DEPTH_SECTIONS.includes(first)) return null;
  if (depth >= 2 && CATCH_ALL_SECTIONS.includes(first)) return null;
  if (depth === 2 && SLUG_SECTIONS.includes(first)) return null;
  // next.config: /wp-content/uploads/:path* and /news/page/:n(\d+)
  if (first === "wp-content" && second === "uploads") return null;
  if (depth === 3 && first === "news" && second === "page" && /^\d+$/.test(third)) return null;
  return { path: `/${segments.join("/")}/`, slug: depth === 1 ? first : null };
}

/** Stored 302/307 stay temporary; everything else is permanent. Same mapping as redirect()/permanentRedirect(). */
export function redirectStatus(stored: number): 307 | 308 {
  return stored === 302 || stored === 307 ? 307 : 308;
}

/** Admin pages need a session; without the cookie there is nothing to check, so send the visitor to sign in. */
export function needsAdminSignIn(pathname: string, cookieHeader: string | null): boolean {
  const path = pathname.split("/").map(decodeSegment).join("/");
  if (!path.startsWith("/admin/") || path.startsWith("/admin/login/") || path.startsWith("/admin/api/")) return false;
  const names = (cookieHeader ?? "").split(";").map((part) => part.split("=")[0].trim());
  return !names.includes(ADMIN_SESSION_COOKIE);
}

/**
 * Location for a stored target. Targets on this site stay relative, so they do not depend on the
 * host the runtime reports (the local Worker sees localhost). Null when the stored value is unusable.
 */
export function redirectLocation(target: string, base: URL): string | null {
  try {
    const resolved = new URL(target, base);
    return resolved.origin === base.origin ? `${resolved.pathname}${resolved.search}${resolved.hash}` : resolved.href;
  } catch {
    return null;
  }
}

const redirectTo = (location: string, status: number) => new Response(null, { status, headers: { Location: location } });

// Same tests as getPageBySlug / getPostBySlug: content at a single-segment address wins over a redirect.
const LOOKUP_SQL = `
select
  (?2 is not null and (
    exists (select 1 from pages where slug = ?2 and status = 'published')
    or exists (select 1 from posts where slug = ?2 and status = 'published' and published_at <= ?3)
  )) as hasContent,
  r.to_path as toPath,
  r.status_code as statusCode
from (select 1) left join redirects r on r.from_path = ?1`;

type LookupRow = { hasContent: number; toPath: string | null; statusCode: number | null };

export type EdgeDecision =
  | { kind: "respond"; response: Response }
  /** notFound: the page will only render the not-found UI, so the response should carry a 404. */
  | { kind: "render"; notFound: boolean };

const RENDER: EdgeDecision = { kind: "render", notFound: false };

/** Decides whether the Worker answers the request itself or lets Next.js render it. Fails open: on any error, Next.js renders. */
export async function routeAtEdge(request: Request, db: D1Database): Promise<EdgeDecision> {
  if (request.method !== "GET" && request.method !== "HEAD") return RENDER;
  const url = new URL(request.url);

  if (needsAdminSignIn(url.pathname, request.headers.get("cookie"))) {
    return { kind: "respond", response: redirectTo("/admin/login/", 307) };
  }

  // Only /en/ is stripped: /ml/… is a next.config redirect, which redirectScope leaves to Next.js.
  const english = url.pathname === EN_PREFIX || url.pathname.startsWith(`${EN_PREFIX}/`);
  const locale: Locale = english ? "en" : "ml";
  const scope = redirectScope(english ? url.pathname.slice(EN_PREFIX.length) || "/" : url.pathname);
  if (!scope) return RENDER;
  let row: LookupRow | null;
  try {
    row = await db.prepare(LOOKUP_SQL).bind(scope.path, scope.slug, new Date().toISOString()).first<LookupRow>();
  } catch (error) {
    console.error("edge-routing: redirect lookup failed, rendering instead", error);
    return RENDER;
  }
  if (row?.hasContent) return RENDER;
  if (row?.toPath) {
    const location = redirectLocation(row.toPath, url);
    return location ? { kind: "respond", response: redirectTo(localizePath(location, locale), redirectStatus(row.statusCode ?? 301)) } : RENDER;
  }
  // Client navigations (RSC requests) keep their status so the router can render the not-found UI in place.
  return { kind: "render", notFound: !request.headers.has("rsc") };
}

/** Gives a rendered not-found page its 404. Anything else (the trailing-slash 308, errors) passes unchanged. */
export function asNotFound(response: Response): Response {
  if (response.status !== 200) return response;
  return new Response(response.body, { status: 404, statusText: "Not Found", headers: response.headers });
}
