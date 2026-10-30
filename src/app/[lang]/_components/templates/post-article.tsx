import { CalendarDays, Clock, Hash } from "lucide-react";
import Link from "@/components/i18n/link";
import { LanguageNotice } from "@/components/i18n/language-notice";
import { ArticleJsonLd } from "@/components/seo/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { htmlToText } from "@/lib/content/sanitize";
import { formatDate } from "@/lib/format";
import { getRelatedPosts, type PostDetail } from "@/lib/data/posts";
import { getSettings } from "@/lib/data/settings";
import { langAttr, localizePath } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { pickVariant } from "@/lib/media-url";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site-url";
import { ArticleBody, PageHero, SideCard } from "../article-chrome";
import { PostList } from "../post-list";
import { CopyLinkButton } from "./share-links";

/** Malayalam words run long; 180 words a minute is a fair reading pace. */
function readingMinutes(html: string): number {
  const words = htmlToText(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

const shareLink =
  "inline-flex min-h-11 items-center rounded-full border border-border/80 bg-white px-4 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-navy hover:text-navy";

function ShareCard({ url, title, t }: { url: string; title: string; t: Dictionary }) {
  const u = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  const targets = [
    { label: "WhatsApp", href: `https://wa.me/?text=${text}%20${u}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${text}` },
  ];
  return (
    <SideCard title={t.post.share}>
      <div className="flex flex-wrap gap-2">
        {targets.map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className={shareLink}>
            {s.label}
            <span className="sr-only"> {t.common.newTab}</span>
          </a>
        ))}
        <CopyLinkButton url={url} />
      </div>
    </SideCard>
  );
}

export async function PostArticle({ post }: { post: PostDetail }) {
  const { locale, t } = await getI18n();
  const [related, settings] = await Promise.all([getRelatedPosts(post.id, post.categories.map((c) => c.id), locale), getSettings(locale)]);
  const primary = post.categories[0];
  const url = localizePath(routes.post(post.slug), locale);
  const minutes = readingMinutes(post.contentHtml);
  return (
    <>
      <ArticleJsonLd
        url={url}
        title={post.title}
        description={post.seoDescription || post.excerpt}
        image={post.featuredMedia ? absoluteUrl(pickVariant(post.featuredMedia, 1200)) : undefined}
        publishedAt={post.publishedAt}
        updatedAt={post.updatedAt}
        publisher={settings.site.name}
        lang={post.lang}
      />
      <article>
        <PageHero
          title={post.title}
          lang={langAttr(post.lang, locale)}
          crumbs={[{ name: t.nav.news, url: "/news/" }, ...(primary ? [{ name: primary.name, url: routes.category([primary.slug]) }] : []), { name: post.title, url }]}
          image={post.featuredMedia}
          aside={
            <>
              {post.publishedAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-gold" aria-hidden="true" />
                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, "long", locale)}</time>
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4 text-gold" aria-hidden="true" />
                {t.post.minutesRead(minutes)}
              </span>
              {post.categories.length ? (
                <span className="flex flex-wrap gap-2">
                  <span className="sr-only">{t.post.categories}</span>
                  {post.categories.map((c) => (
                    <Link
                      key={c.id}
                      href={routes.category([c.slug])}
                      className="inline-flex min-h-8 items-center rounded-full bg-white/10 px-3 text-white no-underline transition-colors hover:bg-white hover:!text-navy"
                    >
                      {c.name}
                    </Link>
                  ))}
                </span>
              ) : null}
            </>
          }
        />
        <ArticleBody
          html={post.contentHtml}
          lang={langAttr(post.lang, locale)}
          notice={<LanguageNotice lang={post.lang} />}
          aside={
            <>
              <ShareCard url={absoluteUrl(url)} title={post.title} t={t} />
              {post.tags.length ? (
                <SideCard title={t.post.topics}>
                  <ul className="flex flex-wrap gap-2">
                    {post.tags.map((t) => (
                      <li key={t.slug}>
                        <Link
                          href={routes.tag(t.slug)}
                          className="inline-flex min-h-10 items-center gap-1 rounded-full bg-white px-3 text-sm font-medium text-navy shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-navy hover:text-white"
                        >
                          <Hash className="size-3.5" aria-hidden="true" />
                          {t.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </SideCard>
              ) : null}
            </>
          }
        />
      </article>
      {related.length ? (
        <section aria-labelledby="related-title" className="lattice-ink bg-mist py-[var(--section-gap)] [--lattice-mask:linear-gradient(180deg,#000,transparent_60%)]">
          <div className="page-frame space-y-10">
            <SectionHeading id="related-title" title={t.post.related} lead={t.post.relatedLead} link={{ href: "/news/", label: t.news.all }} />
            <PostList posts={related} headingLevel="h3" />
          </div>
        </section>
      ) : null}
    </>
  );
}
