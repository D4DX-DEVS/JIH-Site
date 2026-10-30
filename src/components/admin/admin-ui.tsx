import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { Inbox, Plus, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Title row: the screen's noun, one grey sentence about the data, and its one primary action on the right. */
export function PageHeader({ title, description, action, children }: { title: string; description?: string; action?: { label: string; href: string }; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-heading text-[1.75rem] leading-tight font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? (
        <Button asChild className="h-10 px-4 shadow-sm">
          <Link href={action.href}>
            <Plus className="size-4" aria-hidden="true" /> {action.label}
          </Link>
        </Button>
      ) : null}
      {children}
    </div>
  );
}

export interface StatCardItem {
  label: string;
  value: number | string;
  hint?: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean | "true" }>;
  href?: string;
}

/** A row of count cards: icon in a soft tile, label, the figure, one line of context. */
export function StatCards({ items }: { items: StatCardItem[] }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4", items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {items.map(({ label, value, hint, icon: Icon, href }) => {
        const body = (
          <>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-sky)] text-[var(--admin-navy)] sm:size-11">
              <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs leading-snug text-muted-foreground sm:text-sm">{label}</span>
              <span className="block font-heading text-2xl leading-tight font-bold tabular-nums sm:text-[1.75rem]">{value}</span>
              {hint ? <span className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">{hint}</span> : null}
            </span>
          </>
        );
        const className = "admin-card flex items-center gap-3 p-4 sm:gap-4 sm:p-5";
        return href ? (
          <Link key={label} href={href} className={cn(className, "transition-colors hover:border-[var(--admin-sky-deep)]")}>
            {body}
          </Link>
        ) : (
          <div key={label} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** The list card: toolbar on top, the table below, one white block on the canvas. */
export function ListPanel({ toolbar, children, className }: { toolbar?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("admin-card overflow-hidden", className)}>
      {toolbar ? <div className="border-b border-border p-4">{toolbar}</div> : null}
      {children}
    </section>
  );
}

export function TableSkeleton({ columns, rows = 10 }: { columns: number; rows?: number }) {
  return (
    <div role="status" aria-label="Loading">
      <div className="grid gap-4 border-b border-border bg-muted/50 px-4 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 w-1/2" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid gap-4 border-b border-[var(--admin-rule)] px-4 py-4 last:border-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
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
    <div role="status" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-5" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <p className="font-medium">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? (
        <Button asChild variant="outline" className="h-9">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function AdminErrorState({ message, retryHref }: { message: string; retryHref: string }) {
  return (
    <div role="alert" className="admin-card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <p className="font-medium">{message}</p>
      <Button asChild variant="outline" className="h-9">
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
    <Badge variant="secondary" className={cn("rounded-md px-2 py-0.5 font-medium", STATUS_STYLES[status] ?? "")}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function Panel({ title, description, children, actions, className }: { title: string; description?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn("admin-card p-5 sm:p-6", className)}>
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
