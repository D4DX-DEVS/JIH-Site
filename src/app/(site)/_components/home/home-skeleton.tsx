import { PostCardSkeleton } from "@/components/site/post-card";
import { Skeleton } from "@/components/ui/skeleton";

/** Shaped like the homepage: hero, ticker, the Latest Updates bento and a card row. */
export function HomeSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div className="flex min-h-[min(88svh,54rem)] flex-col justify-center bg-navy-deep">
        <div className="page-frame space-y-6">
          <Skeleton className="h-8 w-64 rounded-full opacity-20" />
          <Skeleton className="h-16 w-full max-w-2xl opacity-20" />
          <Skeleton className="h-16 w-2/3 max-w-xl opacity-20" />
          <Skeleton className="h-6 w-full max-w-lg opacity-20" />
          <div className="flex gap-3">
            <Skeleton className="h-12 w-40 rounded-full opacity-20" />
            <Skeleton className="h-12 w-48 rounded-full opacity-20" />
          </div>
        </div>
      </div>
      <div className="h-11 bg-maroon" />
      <div className="page-frame space-y-10 py-[var(--section-gap)]">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <PostCardSkeleton variant="feature" />
          </div>
          <div className="space-y-6 rounded-2xl border border-border/70 p-5 lg:col-span-5">
            {Array.from({ length: 4 }, (_, i) => (
              <PostCardSkeleton key={i} variant="row" />
            ))}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
