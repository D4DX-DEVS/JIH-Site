import { cn } from "@/lib/utils"

/** Shimmer placeholder. Decorative: wrap groups in an element with aria-busy / a status label. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "rounded-md bg-[linear-gradient(90deg,var(--tint)_0%,#f7f8fc_50%,var(--tint)_100%)] bg-[length:200%_100%] motion-safe:animate-[shimmer_1.6s_linear_infinite]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
