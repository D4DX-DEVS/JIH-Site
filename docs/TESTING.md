# Testing

## Commands

| Check | Command | Covers |
|---|---|---|
| Types | `npm run typecheck` | Whole project, strict TypeScript |
| Lint | `npm run lint` | ESLint (Next core-web-vitals and TypeScript rules, a 500-line file limit, no native `<select>`/`<dialog>`) |
| Unit | `npm test` | `tests/unit/`: password hashing, upload validation, slugs, Zod schemas (including `javascript:` URL rejection), list parameters, edge routing |
| Build (Node) | `npm run build` | `next build` with Cache Components |
| Build (Workers) | `npm run cf:build` | OpenNext bundle plus `scripts/patch-worker.mjs` |
| Migration | `npm run migrate:verify` | Source JSON against D1, every R2 object, content links, redirects (`docs/MIGRATION_REPORT.md`) |
| End to end | `npm run test:e2e` | `tests/e2e/`, against a running server (below) |

## Running the end-to-end suite

The suite targets a running server, normally the Worker build in local workerd with emulated D1 and R2:

```bash
npm run admin:hash-password                     # make a throwaway test password and hash
npm run preview -- --var "ADMIN_EMAIL:test@example.org" --var "ADMIN_PASSWORD_HASH:<hash>"
E2E_ADMIN_EMAIL=test@example.org E2E_ADMIN_PASSWORD=<test password> npm run test:e2e
```

- `E2E_BASE_URL` changes the target (default `http://127.0.0.1:8787`). Against a deployed preview, run only the public specs (see `docs/DEPLOYMENT.md` step 8).
- Without `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`, the signed-in admin tests skip themselves. Never use the production password.
- The upload test creates one image and deletes it again. The wrong-password test counts towards the login rate limit (5 per 15 minutes).

| Spec | What it proves |
|---|---|
| `public.spec.ts` | Every homepage section; header navigation; news pagination; past-the-end page; article with breadcrumb JSON-LD; search results and empty results; contact form validation |
| `seo-routing.spec.ts` | Status codes: 200 for pages; 404 for missing pages; 308 for stored, config and trailing-slash redirects; 307 to login. Plus noindex on 404s, metadata, `robots.txt`, sitemap and RSS |
| `admin.spec.ts` | Signed-out redirects, forged-cookie rejection, anonymous and cross-site upload refusal, `X-Robots-Tag`, wrong password, sign-in and sign-out, image upload and delete |
| `responsive-a11y.spec.ts` | No sideways scrolling at 375/768/1280 px on 8 page types; the mobile menu; no section left invisible by entrance animations (with and without reduced motion, by computed opacity); axe WCAG 2.1 AA with no serious or critical violations on 7 pages |

## Latest results (2026-10-29, Windows 11, local Worker build)

| Check | Result |
|---|---|
| `npm run typecheck` | Pass, no errors |
| `npm run lint` | Pass, no errors or warnings |
| `npm test` | 41 of 41 passed (4 files) |
| `npm run cf:build` (includes `next build`) | Pass |
| `npm run migrate:verify` (local D1/R2) | See `docs/MIGRATION_REPORT.md`: 1 content problem (the `/medical/` staging email); 23 media unavailable at the source |
| `npm run test:e2e` against `opennextjs-cloudflare preview` | 42 of 42 passed |

Testing found two real defects. Both are fixed and covered by regression tests:

- **Uploads refused on the Worker.** The upload API compared the `Origin` header with `request.url`, which OpenNext rewrites to `localhost` on the local Worker, so every upload got a 403. It now compares with the `Host` header the browser sent, as Next.js does for server actions. A test checks that a foreign origin is still refused.
- **Invisible sections for visitors who prefer reduced motion.** The entrance animation rendered a different element on the client than on the server when reduced motion was on. React does not repair attribute mismatches during hydration, so 55 of the homepage's 63 animated blocks kept the server's `opacity:0` permanently. Server and client now render the same markup, and reduced motion only makes the entrance instant. Playwright's `toBeVisible()` counts `opacity:0` as visible, which is why the new tests read the computed opacity.

An independent code review of the Worker entry, the edge routing, the upload origin check and the patch script found no critical or high issues. Its two medium findings are fixed: the Worker now renders normally if the D1 lookup fails, and only real root files skip routing, so `/xmlrpc.php` gets a 404. Its low findings are fixed as well: precise section rules, relative `Location` headers, protocol-relative link targets refused, route coverage checked across all of `src/app`, OpenNext's Durable Objects re-exported, and the admin gate decoding the path.

Dev server note: Next.js 16 blocks dev resources for origins other than `localhost`. Open `next dev` at `http://localhost:3000`, not `127.0.0.1`, or pages will not hydrate.
