import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox, Plus, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-[2rem]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? (
        <Button asChild className="h-11 rounded-full px-5 sm:h-10">
          <Link href={action.href}>
            <Plus className="size-4" aria-hidden="true" /> {action.label}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

export function TableSkeleton({ columns, rows = 10 }: { columns: number; rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="overflow-hidden rounded-lg border">
      <div className="grid gap-4 border-b bg-muted/50 px-4 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-4 w-2/3" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid gap-4 border-b px-4 py-4 last:border-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className={c === 0 ? "h-4 w-full" : "h-4 w-1/2"} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AdminEmptyState({ title, description, action }: { title: string; description?: string; action?: { label: string; href: string } }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center">
      <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? (
        <Button asChild variant="outline" className="h-11 sm:h-9">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function AdminErrorState({ message, retryHref }: { message: string; retryHref: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-14 text-center">
      <TriangleAlert className="size-8 text-destructive" aria-hidden="true" />
      <p className="font-medium">{message}</p>
      <Button asChild variant="outline" className="h-11 sm:h-9">
        <Link href={retryHref}>Retry</Link>
      </Button>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-800",
  draft: "bg-amber-100 text-amber-900",
  new: "bg-blue-100 text-blue-900",
  read: "bg-slate-100 text-slate-800",
  archived: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-900",
  hidden: "bg-slate-100 text-slate-700",
};

/** Status as text, never colour alone. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={STATUS_STYLES[status] ?? ""}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function Panel({ title, description, children, actions, className }: { title: string; description?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-card p-5 sm:p-6", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
