import { EmptyState } from "@/components/shared/states";
import { LinkPagination } from "@/components/shared/link-pagination";
import type { Paginated } from "@/lib/pagination";
import type { PostSummary } from "@/lib/data/posts";
import { PageHero, type Crumb } from "../article-chrome";
import { PostList } from "../post-list";

/** Archive of posts for a category or tag. */
export function PostArchive({ title, lead, crumbs, basePath, result }: { title: string; lead?: string; crumbs: Crumb[]; basePath: string; result: Paginated<PostSummary> }) {
  return (
    <>
      <PageHero
        title={title}
        lead={lead}
        crumbs={crumbs}
        aside={
          <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white">
            {result.total} {result.total === 1 ? "article" : "articles"}
          </p>
        }
      />
      <section className="page-frame py-10 lg:py-14">
        <h2 className="sr-only">Articles</h2>
        {result.data.length ? (
          <PostList posts={result.data} featureFirst={result.page === 1 && result.data.length >= 4} />
        ) : (
          <EmptyState title="No articles here yet" description="Articles filed under this heading will appear here." action={{ label: "All news", href: "/news/" }} />
        )}
        <div className="mt-12">
          <LinkPagination basePath={basePath} page={result.page} totalPages={result.totalPages} total={result.total} />
        </div>
      </section>
    </>
  );
}
