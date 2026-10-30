import { Reveal } from "@/components/motion/reveal";
import { PostCard, PostCardSkeleton } from "@/components/site/post-card";
import type { PostSummary } from "@/lib/data/posts";
import { LoadingStatus } from "@/components/i18n/loading-status";
import { cn } from "@/lib/utils";

interface PostListProps {
  posts: PostSummary[];
  headingLevel?: "h2" | "h3";
  /** Show the first post as a large picture card spanning two columns and two rows. */
  featureFirst?: boolean;
  columns?: 2 | 3;
}

const GRID = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3" } as const;

/** Posts as a card grid. Each card rises in as it scrolls into view, staggered by column. */
export function PostList({ posts, headingLevel = "h2", featureFirst = false, columns = 3 }: PostListProps) {
  return (
    <ul className={cn("grid gap-5 sm:gap-6", GRID[columns])}>
      {posts.map((post, i) => {
        const feature = featureFirst && i === 0;
        return (
          <Reveal
            key={post.id}
            as="li"
            delay={feature ? 0 : (i % columns) * 0.08}
            className={cn(feature && (columns === 3 ? "sm:col-span-2 lg:row-span-2" : "sm:col-span-2"))}
          >
            <PostCard post={post} variant={feature ? "feature" : "card"} headingLevel={headingLevel} priority={i < 2} className={feature ? "h-full" : undefined} />
          </Reveal>
        );
      })}
    </ul>
  );
}

export function PostListSkeleton({ rows = 6, featureFirst = false }: { rows?: number; featureFirst?: boolean }) {
  return (
    <LoadingStatus what="posts" className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {Array.from({ length: rows }, (_, i) =>
        featureFirst && i === 0 ? (
          <div key={i} className="sm:col-span-2 lg:row-span-2">
            <PostCardSkeleton variant="feature" />
          </div>
        ) : (
          <PostCardSkeleton key={i} />
        ),
      )}
    </LoadingStatus>
  );
}
