import type { Metadata } from "next";
import { Suspense } from "react";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { AdminEmptyState, PageHeader, TableSkeleton } from "@/components/admin/admin-ui";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { activityLog } from "@/db/schema";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { likePattern } from "@/lib/pagination";
import { ActivityTabs } from "./activity-tabs";

export const metadata: Metadata = { title: "Activity log" };
export const instant = false;

const SORTS = ["createdAt"] as const;
type Sort = (typeof SORTS)[number];
const ACTIONS = ["create", "update", "delete", "upload", "login", "logout"] as const;

async function ActivityTable({ params, entity }: { params: AdminListParams<Sort>; entity: string }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (params.status) where.push(eq(activityLog.action, params.status));
  if (entity) where.push(eq(activityLog.entityType, entity));
  if (params.q) where.push(sql`(lower(${activityLog.summary}) like ${likePattern(params.q)} escape '\\' or lower(${activityLog.actor}) like ${likePattern(params.q)} escape '\\')`);
  const condition = where.length ? and(...where) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(activityLog)
      .where(condition)
      .orderBy(params.order === "asc" ? asc(activityLog.createdAt) : desc(activityLog.createdAt), desc(activityLog.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(activityLog).where(condition),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  if (!rows.length) {
    return params.q || params.status || entity ? (
      <AdminEmptyState title="No activity matches these filters" action={{ label: "Clear filters", href: "/admin/activity/" }} />
    ) : (
      <AdminEmptyState title="No activity recorded yet" description="Sign-ins and every change made in the admin are listed here." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>What happened</TableHead>
              <TableHead className="hidden w-28 md:table-cell">Action</TableHead>
              <TableHead className="hidden lg:table-cell">By</TableHead>
              <TableHead className="w-40">When (IST)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="max-w-0 whitespace-normal">
                  <p className="line-clamp-2 text-sm">{a.summary || `${a.action} ${a.entityType} ${a.entityId}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.entityType}
                    {a.entityId ? ` #${a.entityId}` : ""}
                  </p>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="secondary">{a.action}</Badge>
                </TableCell>
                <TableCell className="hidden max-w-0 truncate text-sm text-muted-foreground lg:table-cell">{a.actor}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDateTime(a.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DataPagination page={params.page} pageSize={params.pageSize} total={total} totalPages={totalPages} />
    </div>
  );
}

export default async function AdminActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = parseAdminList(sp, { sorts: SORTS, defaultSort: "createdAt", statuses: ACTIONS });
  const db = await getDb();
  const entities = (await db.selectDistinct({ type: activityLog.entityType }).from(activityLog).orderBy(asc(activityLog.entityType))).map((e) => e.type);
  const entity = typeof sp.entity === "string" && entities.includes(sp.entity) ? sp.entity : "";
  return (
    <>
      <PageHeader title="Activity log" description="An audit trail of sign-ins and changes. Entries cannot be edited or removed from the admin." />
      <ActivityTabs current="activity" />
      <ListToolbar
        searchPlaceholder="Search activity"
        filters={[
          { name: "status", label: "Actions", options: ACTIONS.map((a) => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) })) },
          { name: "entity", label: "Items", options: entities.map((e) => ({ value: e, label: e })) },
        ]}
        sorts={[{ value: "createdAt", label: "Time" }]}
        defaultSort="createdAt"
      />
      <Suspense key={JSON.stringify(params) + entity} fallback={<TableSkeleton columns={4} rows={Math.min(params.pageSize, 20)} />}>
        <ActivityTable params={params} entity={entity} />
      </Suspense>
    </>
  );
}
