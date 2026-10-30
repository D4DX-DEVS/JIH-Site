import Link from "@/components/i18n/link";
import type { ReactNode } from "react";
import { ArrowRight, FileQuestion, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div role="status" className={cn("lattice-ink flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-navy/20 bg-mist px-6 py-14 text-center sm:py-20", className)}>
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-white text-navy shadow-soft">
        <FileQuestion className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-2 font-heading text-step-2 font-bold text-ink">{title}</p>
      {description ? <p className="max-w-prose text-ink-soft">{description}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className="group mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-navy px-5 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy-deep"
        >
          {action.label}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  children?: ReactNode;
}

export function ErrorState({ title = "Something went wrong", description, children }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-maroon/20 bg-maroon/[0.04] px-6 py-14 text-center sm:py-20">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-white text-maroon shadow-soft">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-2 font-heading text-step-2 font-bold text-ink">{title}</p>
      {description ? <p className="max-w-prose text-ink-soft">{description}</p> : null}
      {children}
    </div>
  );
}
