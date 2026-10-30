import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Off while OpenNext's staged-render scheduling on workerd is unreleased (opennextjs-cloudflare#1318):
  // runtime prefetches can drop their last stage there. Links still prefetch the static shell.
  partialPrefetching: false,
  // WordPress served every URL with a trailing slash; keep that so legacy URLs resolve unchanged.
  trailingSlash: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Media is served from R2 with pre-generated size variants (see src/components/media/responsive-image.tsx).
    unoptimized: true,
  },
  async redirects() {
    return [
      // TranslatePress mirrored every page under /ml/. Malayalam is the default language and keeps the
      // unprefixed address, so /ml/… goes to the canonical URL (the rewrite below serves it).
      { source: "/ml", destination: "/", permanent: true },
      { source: "/ml/:path+", destination: "/:path+/", permanent: true },
      // Legacy upload URLs (PDF downloads, images linked from other sites) now live in R2.
      { source: "/wp-content/uploads/:path*", destination: "/media/uploads/:path*", permanent: true },
      // WordPress posts page and CPT archives that are superseded by new listing pages.
      { source: "/blog", destination: "/news/", permanent: true },
      { source: "/leadership", destination: "/leaders/", permanent: true },
      { source: "/author/:name", destination: "/news/", permanent: true },
      // WordPress paged archives → query-string pagination.
      { source: "/category/:path*/page/:n(\\d+)", destination: "/category/:path*/?page=:n", permanent: true },
      { source: "/news/page/:n(\\d+)", destination: "/news/?page=:n", permanent: true },
      { source: "/wp-admin/:path*", destination: "/admin/", permanent: false },
      { source: "/wp-login.php", destination: "/admin/login/", permanent: false },
    ];
  },
  async rewrites() {
    // The public site renders through app/[lang]. English addresses carry /en/; every other public
    // address is Malayalam and is served from /ml/… without changing the address in the browser.
    // afterFiles: public files and static routes (feed, robots.txt, sitemap.xml) are matched first.
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/", destination: "/ml/" },
        { source: "/:path((?!(?:en|ml|admin)(?:/|$)|media/|_next/).+)", destination: "/ml/:path" },
      ],
      fallback: [],
    };
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [
      { source: "/:path*", headers: security },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
