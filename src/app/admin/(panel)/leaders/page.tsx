import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { UserRound } from "lucide-react";
import { AdminEmptyState, PageHeader, StatusBadge, TableSkeleton } from "@/components/admin/admin-ui";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { LEADER_GROUPS, leaders, media, type LeaderGroup } from "@/db/schema";
import { LEADER_GROUP_TITLES } from "@/app/(site)/_components/templates/leaders-page";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/auth/session";
import { pickVariant } from "@/lib/media-url";
import { likePattern } from "@/lib/pagination";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Leaders" };
export const instant = false;

const SORTS = ["sortOrder", "name", "updatedAt"] as const;
type Sort = (typeof SORTS)[number];
const SORT_COLUMNS = { sortOrder: leaders.sortOrder, name: leaders.name, updatedAt: leaders.updatedAt } as const;

async function LeadersTable({ params, group }: { params: AdminListParams<Sort>; group: LeaderGroup | null }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (params.status) where.push(eq(leaders.status, params.status as "draft" | "published"));
  if (group) where.push(eq(leaders.groupKey, group));
  if (params.q) {
    const pattern = likePattern(params.q);
    where.push(sql`(lower(${leaders.name}) like ${pattern} escape '\\' or lower(${leaders.roleTitle}) like ${pattern} escape '\\')`);
  }
  const condition = where.length ? and(...where) : undefined;
  const orderBy = params.order === "asc" ? asc(SORT_COLUMNS[params.sort]) : desc(SORT_COLUMNS[params.sort]);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: leaders.id, name: leaders.name, slug: leaders.slug, roleTitle: leaders.roleTitle, groupKey: leaders.groupKey, status: leaders.status, sortOrder: leaders.sortOrder,
        photo: { r2Key: media.r2Key, width: media.width, height: media.height, altText: media.altText, variants: media.variants },
      })
      .from(leaders)
      .leftJoin(media, eq(media.id, leaders.photoMediaId))
      .where(condition)
      .orderBy(orderBy, asc(leaders.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(leaders).where(condition),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  if (!rows.length) {
    return params.q || params.status || group ? (
      <AdminEmptyState title="No leaders match these filters" description="Change the search or filters." action={{ label: "Clear filters", href: "/admin/leaders/" }} />
    ) : (
      <AdminEmptyState title="No leaders yet" action={{ label: "Add the first leader", href: "/admin/leaders/new/" }} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">
                <span className="sr-only">Photo</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden w-44 md:table-cell">Group</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="hidden w-20 lg:table-cell">Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  {l.photo?.r2Key ? (
                    // eslint-disable-next-line @next/next/no-img-element -- R2 media with stored variants; next/image is unoptimized here
                    <img src={pickVariant(l.photo, 300)} alt="" loading="lazy" className="size-11 rounded-md object-cover" />
                  ) : (
                    <span className="flex size-11 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <UserRound className="size-5" aria-hidden="true" />
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-0 whitespace-normal">
                  <Link href={`/admin/leaders/${l.id}/`} className="line-clamp-2 font-medium hover:underline">
                    {l.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{l.roleTitle}</span>
                  <a href={routes.leader(l.slug)} target="_blank" rel="noopener" className="text-xs text-muted-foreground hover:underline">
                    View on site
                  </a>
                </TableCell>
                <TableCell className="hidden text-sm md:table-cell">{LEADER_GROUP_TITLES[l.groupKey]}</TableCell>
                <TableCell>
                  <StatusBadge status={l.status} />
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground tabular-nums lg:table-cell">{l.sortOrder}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DataPagination page={params.page} pageSize={params.pageSize} total={total} totalPages={totalPages} />
    </div>
  );
}

export default async function AdminLeadersPage({ searchParams }: PageProps<"/admin/leaders">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = parseAdminList(sp, { sorts: SORTS, defaultSort: "sortOrder", defaultOrder: "asc", statuses: ["draft", "published"] });
  const groupRaw = typeof sp.group === "string" ? sp.group : "";
  const group = (LEADER_GROUPS as readonly string[]).includes(groupRaw) ? (groupRaw as LeaderGroup) : null;
  return (
    <>
      <PageHeader title="Leaders" description="The Ameer, secretaries and Shoora members shown on the leaders page." action={{ label: "Add leader", href: "/admin/leaders/new/" }} />
      <ListToolbar
        searchPlaceholder="Search by name or role"
        filters={[
          { name: "status", label: "Statuses", options: [{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }] },
          { name: "group", label: "Groups", options: LEADER_GROUPS.map((g) => ({ value: g, label: LEADER_GROUP_TITLES[g] })) },
        ]}
        sorts={[{ value: "sortOrder", label: "Order" }, { value: "name", label: "Name" }, { value: "updatedAt", label: "Updated" }]}
        defaultSort="sortOrder"
      />
      <Suspense key={JSON.stringify(params) + group} fallback={<TableSkeleton columns={5} rows={params.pageSize > 20 ? 20 : params.pageSize} />}>
        <LeadersTable params={params} group={group} />
      </Suspense>
    </>
  );
}
