import type { Metadata } from "next";
import { Suspense } from "react";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { AdminEmptyState, PageHeader, TableSkeleton } from "@/components/admin/admin-ui";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { MIGRATION_STATUSES, migrationItems, type MigrationStatus } from "@/db/schema";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/auth/session";
import { likePattern } from "@/lib/pagination";
import { ActivityTabs } from "../activity-tabs";

export const metadata: Metadata = { title: "WordPress import ledger" };
export const instant = false;

const SORTS = ["status", "sourceType", "updatedAt"] as const;
type Sort = (typeof SORTS)[number];

const STATUS_STYLE: Record<MigrationStatus, string> = {
  imported: "bg-emerald-100 text-emerald-900",
  skipped: "bg-slate-100 text-slate-700",
  failed: "bg-red-100 text-red-900",
  unresolved: "bg-amber-100 text-amber-900",
};

async function LedgerTable({ params, type }: { params: AdminListParams<Sort>; type: string }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (params.status) where.push(eq(migrationItems.status, params.status as MigrationStatus));
  if (type) where.push(eq(migrationItems.sourceType, type));
  if (params.q) {
    const p = likePattern(params.q);
    where.push(sql`(lower(${migrationItems.sourceId}) like ${p} escape '\\' or lower(${migrationItems.sourceUrl}) like ${p} escape '\\' or lower(${migrationItems.message}) like ${p} escape '\\')`);
  }
  const condition = where.length ? and(...where) : undefined;
  // "status" sorts problems first so the items needing attention lead the list.
  const statusRank = sql`case ${migrationItems.status} when 'failed' then 0 when 'unresolved' then 1 when 'skipped' then 2 else 3 end`;
  const column = { status: statusRank, sourceType: migrationItems.sourceType, updatedAt: migrationItems.updatedAt }[params.sort];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(migrationItems)
      .where(condition)
      .orderBy(params.order === "asc" ? asc(column) : desc(column), asc(migrationItems.sourceType), asc(migrationItems.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(migrationItems).where(condition),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  if (!rows.length) {
    return params.q || params.status || type ? (
      <AdminEmptyState title="No ledger entries match these filters" action={{ label: "Clear filters", href: "/admin/activity/migration/" }} />
    ) : (
      <AdminEmptyState title="The import ledger is empty" description="Run npm run migrate:import to import the WordPress content. Each item it handles is recorded here." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="admin-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="w-28">Outcome</TableHead>
              <TableHead className="hidden lg:table-cell">Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="max-w-0 whitespace-normal">
                  <p className="text-sm font-medium">
                    {m.sourceType} <span className="font-normal text-muted-foreground">#{m.sourceId}</span>
                  </p>
                  {m.sourceUrl ? <p className="break-all text-xs text-muted-foreground">{m.sourceUrl}</p> : null}
                  {m.message ? <p className="mt-1 text-xs lg:hidden">{m.message}</p> : null}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={STATUS_STYLE[m.status]}>
                    {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden max-w-0 whitespace-normal text-sm text-muted-foreground lg:table-cell">
                  {m.message || (m.targetTable ? `→ ${m.targetTable} #${m.targetId}` : "")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DataPagination page={params.page} pageSize={params.pageSize} total={total} totalPages={totalPages} />
    </div>
  );
}

export default async function MigrationLedgerPage({ searchParams }: PageProps<"/admin/activity/migration">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = parseAdminList(sp, { sorts: SORTS, defaultSort: "status", defaultOrder: "asc", statuses: MIGRATION_STATUSES });
  const db = await getDb();
  const types = (await db.selectDistinct({ type: migrationItems.sourceType }).from(migrationItems).orderBy(asc(migrationItems.sourceType))).map((t) => t.type);
  const type = typeof sp.type === "string" && types.includes(sp.type) ? sp.type : "";
  return (
    <>
      <PageHeader title="Activity log" description="What the WordPress import did with every item it found. Details are in docs/MIGRATION_REPORT.md." />
      <ActivityTabs current="migration" />
      <ListToolbar
        searchPlaceholder="Search id, address or note"
        filters={[
          { name: "status", label: "Outcomes", options: MIGRATION_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })) },
          { name: "type", label: "Item types", options: types.map((t) => ({ value: t, label: t })) },
        ]}
        sorts={[{ value: "status", label: "Problems first" }, { value: "sourceType", label: "Type" }, { value: "updatedAt", label: "Last run" }]}
        defaultSort="status"
        defaultOrder="asc"
      />
      <Suspense key={JSON.stringify(params) + type} fallback={<TableSkeleton columns={3} rows={Math.min(params.pageSize, 20)} />}>
        <LedgerTable params={params} type={type} />
      </Suspense>
    </>
  );
}
