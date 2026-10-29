import Link from "next/link";

const TABS = [
  { href: "/admin/activity/", label: "Admin activity", key: "activity" },
  { href: "/admin/activity/migration/", label: "WordPress import", key: "migration" },
] as const;

/** Two views of the audit trail, as real links so each has its own URL. */
export function ActivityTabs({ current }: { current: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Log views" className="flex gap-1 border-b">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className="-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground"
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
