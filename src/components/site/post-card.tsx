import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { PostSummary } from "@/lib/data/posts";
import { cn } from "@/lib/utils";

type Variant = "card" | "feature" | "row";

interface PostCardProps {
  post: PostSummary;
  variant?: Variant;
  headingLevel?: "h2" | "h3";
  priority?: boolean;
  className?: string;
}

function Meta({ post, light }: { post: PostSummary; light?: boolean }) {
  const category = post.categories[0];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium", light ? "text-on-navy-soft" : "text-ink-soft")}>
      {category ? (
        <span className={cn("rounded-full px-2.5 py-1", light ? "bg-white/15 text-white" : "bg-maroon/8 text-maroon")}>{category.name}</span>
      ) : null}
      {post.publishedAt ? (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </span>
      ) : null}
    </div>
  );
}

/** A post as a card. `feature` overlays the headline on a large picture; `row` is a compact list item. */
export function PostCard({ post, variant = "card", headingLevel = "h3", priority = false, className }: PostCardProps) {
  const Heading = headingLevel;
  const href = routes.post(post.slug);
  const image = post.featuredMedia;

  if (variant === "feature") {
    return (
      <article className={cn("group card-lift relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-2xl bg-navy-deep text-white lg:min-h-[34rem]", className)}>
        {image ? (
          <ResponsiveImage media={image} fallbackAlt="" sizes="(min-width: 1024px) 60vw, 100vw" priority={priority} className="img-zoom absolute inset-0 -z-10 size-full" />
        ) : (
          <div className="lattice absolute inset-0 -z-10 bg-navy" aria-hidden="true" />
        )}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-deep via-navy-deep/70 to-transparent" />
        <div className="space-y-3 p-6 sm:p-8">
          <Meta post={post} light />
          <Heading className="font-heading text-2xl font-extrabold leading-tight sm:text-3xl">
            <Link href={href} className="link-draw after:absolute after:inset-0">
              {post.title}
            </Link>
          </Heading>
          {post.excerpt ? <p className="line-clamp-2 max-w-2xl text-on-navy-soft">{post.excerpt}</p> : null}
        </div>
      </article>
    );
  }

  if (variant === "row") {
    return (
      <article className={cn("group relative flex gap-4", className)}>
        <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-mist sm:w-36">
          {image ? <ResponsiveImage media={image} fallbackAlt="" sizes="9rem" className="img-zoom size-full" /> : <div className="lattice-ink size-full" aria-hidden="true" />}
        </div>
        <div className="min-w-0 space-y-2 py-0.5">
          <Meta post={post} />
          <Heading className="line-clamp-3 font-heading text-base font-bold leading-snug text-ink transition-colors group-hover:text-navy sm:text-lg">
            <Link href={href} className="after:absolute after:inset-0">
              {post.title}
            </Link>
          </Heading>
        </div>
      </article>
    );
  }

  return (
    <article className={cn("group card-lift relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-white shadow-soft", className)}>
      <div className="relative aspect-[16/10] overflow-hidden bg-mist">
        {image ? (
          <ResponsiveImage media={image} fallbackAlt="" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" priority={priority} className="img-zoom size-full" />
        ) : (
          <div className="lattice-ink size-full" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <Meta post={post} />
        <Heading className="line-clamp-3 font-heading text-lg font-bold leading-snug text-ink transition-colors group-hover:text-navy sm:text-xl">
          <Link href={href} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </Heading>
        {post.excerpt ? <p className="line-clamp-3 text-[0.95rem] leading-relaxed text-ink-soft">{post.excerpt}</p> : null}
      </div>
    </article>
  );
}

export function PostCardSkeleton({ variant = "card" }: { variant?: Variant }) {
  if (variant === "row") {
    return (
      <div className="flex gap-4">
        <Skeleton className="aspect-[4/3] w-28 shrink-0 rounded-xl sm:w-36" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>
    );
  }
  if (variant === "feature") return <Skeleton className="min-h-[26rem] rounded-2xl lg:min-h-[34rem]" />;
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-5 sm:p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
