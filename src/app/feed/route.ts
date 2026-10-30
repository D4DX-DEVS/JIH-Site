import { connection } from "next/server";
import { listPosts } from "@/lib/data/posts";
import { getSettings } from "@/lib/data/settings";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site-url";

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** RSS 2.0 feed at the WordPress feed URL (/feed/), so existing subscribers keep receiving posts. */
export async function GET(): Promise<Response> {
  await connection();
  // The feed predates the English site and its subscribers read Malayalam.
  const [{ data }, { site }] = await Promise.all([listPosts({ page: 1, pageSize: 20 }, "ml"), getSettings("ml")]);
  const items = data
    .map(
      (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${absoluteUrl(routes.post(p.slug))}</link>
      <guid isPermaLink="true">${absoluteUrl(routes.post(p.slug))}</guid>
      ${p.publishedAt ? `<pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>` : ""}
      ${p.categories.map((c) => `<category>${escapeXml(c.name)}</category>`).join("")}
      <description>${escapeXml(p.excerpt)}</description>
    </item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${absoluteUrl("/")}</link>
    <description>${escapeXml(site.tagline)}</description>
    <language>ml</language>
    <atom:link href="${absoluteUrl("/feed/")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
