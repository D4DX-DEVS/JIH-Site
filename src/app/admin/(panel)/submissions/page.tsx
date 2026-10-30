import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { AdminEmptyState, PageHeader, StatusBadge, TableSkeleton } from "@/components/admin/admin-ui";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { formSubmissions, SUBMISSION_STATUSES } from "@/db/schema";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { likePattern } from "@/lib/pagination";

export const metadata: Metadata = { title: "Submissions" };
export const instant = false;

const SORTS = ["createdAt", "name"] as const;
type Sort = (typeof SORTS)[number];

async function SubmissionsTable({ params }: { params: AdminListParams<Sort> }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (params.status) where.push(eq(formSubmissions.status, params.status as (typeof SUBMISSION_STATUSES)[number]));
  if (params.q) {
    const p = likePattern(params.q);
    where.push(
      sql`(lower(${formSubmissions.name}) like ${p} escape '\\' or lower(${formSubmissions.email}) like ${p} escape '\\' or lower(${formSubmissions.subject}) like ${p} escape '\\' or lower(${formSubmissions.message}) like ${p} escape '\\')`,
    );
  }
  const condition = where.length ? and(...where) : undefined;
  const column = { createdAt: formSubmissions.createdAt, name: formSubmissions.name }[params.sort];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: formSubmissions.id, name: formSubmissions.name, email: formSubmissions.email, subject: formSubmissions.subject,
        message: formSubmissions.message, status: formSubmissions.status, createdAt: formSubmissions.createdAt,
      })
      .from(formSubmissions)
      .where(condition)
      .orderBy(params.order === "asc" ? asc(column) : desc(column), desc(formSubmissions.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(formSubmissions).where(condition),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  if (!rows.length) {
    return params.q || params.status ? (
      <AdminEmptyState title="No messages match these filters" action={{ label: "Clear filters", href: "/admin/submissions/" }} />
    ) : (
      <AdminEmptyState title="No messages yet" description="Messages sent from the contact page appear here." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="admin-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead className="hidden md:table-cell">Message</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="hidden w-32 sm:table-cell">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id} className={s.status === "new" ? "font-semibold" : undefined}>
                <TableCell className="max-w-0 whitespace-normal">
                  <Link href={`/admin/submissions/${s.id}/`} className="line-clamp-1 hover:underline">
                    {s.name}
                  </Link>
                  <p className="truncate text-xs font-normal text-muted-foreground">{s.email}</p>
                </TableCell>
                <TableCell className="hidden max-w-0 whitespace-normal md:table-cell">
                  <p className="line-clamp-2 text-sm">
                    {s.subject ? <span>{s.subject} — </span> : null}
                    <span className="font-normal text-muted-foreground">{s.message}</span>
                  </p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
                <TableCell className="hidden text-sm font-normal text-muted-foreground sm:table-cell">{formatDate(s.createdAt, "short")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DataPagination page={params.page} pageSize={params.pageSize} total={total} totalPages={totalPages} />
    </div>
  );
}

export default async function AdminSubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  await requireAdmin();
  const params = parseAdminList(await searchParams, { sorts: SORTS, defaultSort: "createdAt", statuses: SUBMISSION_STATUSES });
  return (
    <>
      <PageHeader title="Submissions" description="Messages sent through the contact form." />
      <ListToolbar
        searchPlaceholder="Search name, email or message"
        filters={[{ name: "status", label: "Statuses", options: [{ value: "new", label: "New" }, { value: "read", label: "Read" }, { value: "archived", label: "Archived" }] }]}
        sorts={[{ value: "createdAt", label: "Received" }, { value: "name", label: "Name" }]}
        defaultSort="createdAt"
      />
      <Suspense key={JSON.stringify(params)} fallback={<TableSkeleton columns={4} rows={Math.min(params.pageSize, 20)} />}>
        <SubmissionsTable params={params} />
      </Suspense>
    </>
  );
}
