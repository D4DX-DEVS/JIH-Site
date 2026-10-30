import { EmptyState } from "@/components/shared/states";
import { LinkPagination } from "@/components/shared/link-pagination";
import type { Paginated } from "@/lib/pagination";
import type { PostSummary } from "@/lib/data/posts";
import { getI18n } from "@/lib/i18n/server";
import { PageHero, type Crumb } from "../article-chrome";
import { PostList } from "../post-list";

/** Archive of posts for a category or tag. */
export async function PostArchive({ title, lead, crumbs, basePath, result }: { title: string; lead?: string; crumbs: Crumb[]; basePath: string; result: Paginated<PostSummary> }) {
  const { t } = await getI18n();
  return (
    <>
      <PageHero
        title={title}
        lead={lead}
        crumbs={crumbs}
        aside={
          <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white">
            {t.news.articles(result.total)}
          </p>
        }
      />
      <section className="page-frame py-10 lg:py-14">
        <h2 className="sr-only">{t.news.articlesHeading}</h2>
        {result.data.length ? (
          <PostList posts={result.data} featureFirst={result.page === 1 && result.data.length >= 4} />
        ) : (
          <EmptyState title={t.news.archiveEmptyTitle} description={t.news.archiveEmptyDescription} action={{ label: t.news.all, href: "/news/" }} />
        )}
        <div className="mt-12">
          <LinkPagination basePath={basePath} page={result.page} totalPages={result.totalPages} total={result.total} />
        </div>
      </section>
    </>
  );
}
