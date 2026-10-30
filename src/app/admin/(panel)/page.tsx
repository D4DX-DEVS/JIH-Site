import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { ArrowRight, CircleAlert, FilePlus, FileText, HardDrive, Images, Inbox, Newspaper, Upload, UserPlus, Video } from "lucide-react";
import { Panel, StatusBadge } from "@/components/admin/admin-ui";
import { getDb } from "@/db/client";
import { formSubmissions, media, migrationItems, pages, posts } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const instant = false;

const count = sql<number>`count(*)`;
const month = sql<string>`substr(${posts.publishedAt}, 1, 7)`;
const monthShort = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const toDate = (m: string) => new Date(`${m}-01T00:00:00Z`);

const MIGRATION_LABELS: Record<string, { label: string; color: string }> = {
  imported: { label: "Imported", color: "var(--chart-1)" },
  skipped: { label: "Skipped", color: "var(--chart-2)" },
  unresolved: { label: "Needs a decision", color: "var(--chart-4)" },
  failed: { label: "Failed", color: "var(--chart-5)" },
};

// "New post" lives in the header, so these cover the other things editors add most.
const QUICK_ACTIONS = [
  { label: "Upload media", href: "/admin/media/", icon: Upload },
  { label: "New page", href: "/admin/pages/new/", icon: FilePlus },
  { label: "New gallery", href: "/admin/galleries/new/", icon: Images },
  { label: "Add video", href: "/admin/videos/new/", icon: Video },
  { label: "Add leader", href: "/admin/leaders/new/", icon: UserPlus },
];

const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Twelve consecutive months ending at the latest month with a published post, empty months included. */
function lastTwelveMonths(rows: { month: string; n: number }[]) {
  const latest = rows[0]?.month;
  if (!latest || Number.isNaN(toDate(latest).getTime())) return [];
  const counts = new Map(rows.map((r) => [r.month, r.n]));
  return Array.from({ length: 12 }, (_, i) => {
    const d = toDate(latest);
    d.setUTCMonth(d.getUTCMonth() - (11 - i));
    const key = d.toISOString().slice(0, 7);
    return { month: key, n: counts.get(key) ?? 0 };
  });
}

export default async function DashboardPage() {
  await requireAdmin();
  const db = await getDb();
  const [[postStats], [pageCount], [mediaStats], [newSubmissions], recentPosts, migration, monthly] = await Promise.all([
    db.select({ published: sql<number>`sum(case when status = 'published' then 1 else 0 end)`, drafts: sql<number>`sum(case when status = 'draft' then 1 else 0 end)` }).from(posts),
    db.select({ n: count }).from(pages),
    db.select({ n: count, bytes: sql<number>`coalesce(sum(size_bytes), 0)` }).from(media),
    db.select({ n: count }).from(formSubmissions).where(eq(formSubmissions.status, "new")),
    db.select({ id: posts.id, title: posts.title, titleEn: posts.titleEn, status: posts.status, updatedAt: posts.updatedAt }).from(posts).orderBy(desc(posts.updatedAt)).limit(5),
    db.select({ status: migrationItems.status, n: count }).from(migrationItems).groupBy(migrationItems.status),
    db.select({ month, n: count }).from(posts).where(isNotNull(posts.publishedAt)).groupBy(month).orderBy(desc(month)),
  ]);

  const stats = [
    { label: "Published posts", value: postStats.published ?? 0, hint: `${postStats.drafts ?? 0} drafts`, href: "/admin/posts/", icon: Newspaper },
    { label: "New messages", value: newSubmissions.n, hint: newSubmissions.n ? "Awaiting reply" : "Inbox clear", href: "/admin/submissions/?status=new", icon: Inbox },
    { label: "Media files", value: mediaStats.n, hint: formatBytes(mediaStats.bytes), href: "/admin/media/", icon: HardDrive },
    { label: "Pages", value: pageCount.n, hint: "On the site", href: "/admin/pages/", icon: FileText },
  ];

  const bars = lastTwelveMonths(monthly);
  const barTotal = bars.reduce((a, b) => a + b.n, 0);
  const tickStep = Math.max(1, Math.ceil(Math.max(...bars.map((b) => b.n), 1) / 4));
  const ticks = [4, 3, 2, 1, 0].map((t) => t * tickStep);
  const axisMax = ticks[0];

  const migrationTotal = migration.reduce((a, m) => a + m.n, 0);
  const imported = migration.find((m) => m.status === "imported")?.n ?? 0;
  const importedPct = migrationTotal ? Math.round((imported / migrationTotal) * 100) : 0;
  const migrationIssues = migration.filter((m) => m.status === "failed" || m.status === "unresolved").reduce((a, m) => a + m.n, 0);
  const migrationOrdered = Object.keys(MIGRATION_LABELS).map((status) => ({ status, n: migration.find((m) => m.status === status)?.n ?? 0 }));
  const ringSegments = migrationOrdered.reduce<{ status: string; length: number; offset: number }[]>((acc, m) => {
    const offset = acc.reduce((a, s) => a + s.length, 0);
    return m.n ? [...acc, { status: m.status, length: (m.n / Math.max(1, migrationTotal)) * RING_LENGTH, offset }] : acc;
  }, []);

  return (
    <>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">{today.format(new Date())}</p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {stats.map(({ label, value, hint, href, icon: Icon }) => (
          <li key={label}>
            <Link href={href} className="flex h-full items-center gap-4 rounded-2xl bg-card p-4 transition-colors hover:bg-accent sm:p-5">
              <span className="hidden size-12 shrink-0 place-items-center rounded-full bg-accent text-primary sm:grid">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs text-muted-foreground sm:text-sm">{label}</span>
                <span className="block font-heading text-2xl font-bold tracking-tight tabular-nums">{value}</span>
                <span className="block truncate text-xs text-muted-foreground">{hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title="Posts published"
          description={bars.length ? `${barTotal} posts, ${monthYear.format(toDate(bars[0].month))} to ${monthYear.format(toDate(bars[11].month))}` : "Nothing published yet"}
          className="lg:col-span-2"
        >
          {bars.length ? (
            <div className="flex gap-3">
              <ol className="flex h-56 flex-col justify-between pb-6 text-right text-xs text-muted-foreground tabular-nums" aria-hidden="true">
                {ticks.map((t) => (
                  <li key={t} className="leading-none">{t}</li>
                ))}
              </ol>
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden="true">
                  {ticks.map((t) => (
                    <span key={t} className="border-t border-dashed border-border" />
                  ))}
                </div>
                <ol className="relative flex h-56 items-end" aria-label="Posts published per month">
                  {bars.map((b, i) => (
                    <li key={b.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${monthYear.format(toDate(b.month))}: ${b.n} posts`}>
                      <span className="flex h-[calc(100%-1.5rem)] w-full items-end justify-center">
                        <span
                          className="w-2.5 rounded-full bg-primary sm:w-3"
                          style={{ height: `${(b.n / axisMax) * 100}%` }}
                          aria-hidden="true"
                        />
                      </span>
                      {/* Twelve labels do not fit on a phone: show every other month there. */}
                      <span className="h-4 text-[11px] text-muted-foreground">
                        <span className="sr-only">{b.n} posts in </span>
                        <span className={cn(i % 2 === 1 && "max-sm:invisible")}>{monthShort.format(toDate(b.month))}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Published posts are charted here by month.</p>
          )}
        </Panel>

        <Panel title="WordPress import" description={`${migrationTotal} items from the old site`}>
          <div className="flex flex-col items-center">
            <div className="relative size-36">
              <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
                <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="var(--muted)" strokeWidth="10" />
                {ringSegments.map((s) => (
                  <circle
                    key={s.status}
                    cx="60"
                    cy="60"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={MIGRATION_LABELS[s.status].color}
                    strokeWidth="10"
                    strokeDasharray={`${s.length} ${RING_LENGTH - s.length}`}
                    strokeDashoffset={-s.offset}
                  />
                ))}
              </svg>
              <p className="absolute inset-0 grid place-content-center text-center">
                <span className="font-heading text-3xl font-bold tabular-nums">{importedPct}%</span>
                <span className="text-xs text-muted-foreground">imported</span>
              </p>
            </div>
            <ul className="mt-5 grid w-full grid-cols-1 gap-x-4 gap-y-2 text-sm min-[400px]:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {migrationOrdered.map((m) => (
                <li key={m.status} className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: MIGRATION_LABELS[m.status].color }} aria-hidden="true" />
                  <span className="truncate text-muted-foreground">{MIGRATION_LABELS[m.status].label}</span>
                  <span className="ml-auto font-medium tabular-nums">{m.n}</span>
                </li>
              ))}
            </ul>
            {migrationIssues ? (
              <Link href="/admin/activity/migration/" className="mt-4 flex items-center gap-2 self-start text-sm font-medium text-[#8a6100] hover:underline">
                <CircleAlert className="size-4 shrink-0" aria-hidden="true" /> Review {migrationIssues} items
              </Link>
            ) : null}
          </div>
        </Panel>

        <Panel
          title="Recently edited"
          actions={<Link href="/admin/posts/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">View all</Link>}
          className="lg:col-span-2"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="pb-2 font-medium">Title</th>
                <th scope="col" className="pb-2 font-medium">Status</th>
                <th scope="col" className="hidden pb-2 text-right font-medium sm:table-cell">Updated</th>
              </tr>
            </thead>
            <tbody>
              {recentPosts.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/posts/${p.id}/`} className="line-clamp-1 font-medium hover:text-primary">
                      {p.title || p.titleEn}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="hidden py-3 text-right whitespace-nowrap text-muted-foreground sm:table-cell">{formatDate(p.updatedAt, "short")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <section className="flex flex-col rounded-xl bg-[var(--admin-rail)] p-5 text-white sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Quick actions</h2>
          <p className="mt-1 text-sm text-white/65">Add something new to the site.</p>
          <ul className="-mx-3 mt-4 space-y-1">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-white/10">
                  <span className="grid size-8 place-items-center rounded-lg bg-white/10">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  {label}
                  <ArrowRight className="ml-auto size-4 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
