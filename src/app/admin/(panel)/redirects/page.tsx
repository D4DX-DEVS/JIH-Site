import type { Metadata } from "next";
import { Suspense } from "react";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminEmptyState, TableSkeleton } from "@/components/admin/admin-ui";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { redirects } from "@/db/schema";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/auth/session";
import { likePattern } from "@/lib/pagination";
import { deleteRedirectAction } from "./actions";
import { RedirectDialog } from "./redirect-dialog";

export const metadata: Metadata = { title: "Redirects" };
export const instant = false;

const SORTS = ["fromPath", "updatedAt"] as const;
type Sort = (typeof SORTS)[number];

async function RedirectsTable({ params }: { params: AdminListParams<Sort> }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (params.status) where.push(eq(redirects.source, params.status as "migration" | "admin"));
  if (params.q) where.push(sql`(lower(${redirects.fromPath}) like ${likePattern(params.q)} escape '\\' or lower(${redirects.toPath}) like ${likePattern(params.q)} escape '\\')`);
  const condition = where.length ? and(...where) : undefined;
  const column = { fromPath: redirects.fromPath, updatedAt: redirects.updatedAt }[params.sort];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(redirects)
      .where(condition)
      .orderBy(params.order === "asc" ? asc(column) : desc(column), asc(redirects.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(redirects).where(condition),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  if (!rows.length) {
    return params.q || params.status ? (
      <AdminEmptyState title="No redirects match these filters" action={{ label: "Clear filters", href: "/admin/redirects/" }} />
    ) : (
      <AdminEmptyState title="No redirects yet" description="Use “Add redirect” above when a page moves." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="admin-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From → to</TableHead>
              <TableHead className="w-28">Type</TableHead>
              <TableHead className="hidden w-28 md:table-cell">Source</TableHead>
              <TableHead className="w-28 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-0 whitespace-normal">
                  <p className="break-all font-mono text-xs sm:text-sm">{r.fromPath}</p>
                  <p className="flex items-start gap-1 break-all font-mono text-xs text-muted-foreground">
                    <ArrowRight className="mt-0.5 size-3 shrink-0" aria-label="to" />
                    {r.toPath}
                  </p>
                </TableCell>
                <TableCell className="text-sm">{r.statusCode === 302 || r.statusCode === 307 ? "Temporary" : "Permanent"}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="secondary">{r.source === "migration" ? "WordPress" : "Admin"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <RedirectDialog
                      redirect={{ id: r.id, fromPath: r.fromPath, toPath: r.toPath, statusCode: r.statusCode as 301 | 302 | 307 | 308 }}
                      trigger={
                        <Button variant="ghost" size="icon" className="size-9 sm:size-8" aria-label={`Edit redirect from ${r.fromPath}`}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                      }
                    />
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="icon" className="size-11 text-destructive sm:size-9" aria-label={`Delete redirect from ${r.fromPath}`}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      }
                      title="Delete this redirect?"
                      description={`${r.fromPath} will return “not found” instead of sending visitors to ${r.toPath}. Search engines may still hold the old address.`}
                      confirmLabel="Delete redirect"
                      action={deleteRedirectAction.bind(null, r.id)}
                    />
                  </div>
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

export default async function AdminRedirectsPage({ searchParams }: PageProps<"/admin/redirects">) {
  await requireAdmin();
  const params = parseAdminList(await searchParams, { sorts: SORTS, defaultSort: "updatedAt", statuses: ["migration", "admin"] });
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Redirects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Old addresses that forward to new ones. Fixed WordPress patterns (/wp-content/, /ml/, /blog/) are handled in code.</p>
        </div>
        <RedirectDialog
          trigger={
            <Button className="h-9 sm:h-8">
              <Plus className="size-4" aria-hidden="true" /> Add redirect
            </Button>
          }
        />
      </div>
      <ListToolbar
        searchPlaceholder="Search addresses"
        filters={[{ name: "status", label: "Sources", options: [{ value: "migration", label: "WordPress" }, { value: "admin", label: "Admin" }] }]}
        sorts={[{ value: "updatedAt", label: "Updated" }, { value: "fromPath", label: "Old address" }]}
        defaultSort="updatedAt"
      />
      <Suspense key={JSON.stringify(params)} fallback={<TableSkeleton columns={4} rows={Math.min(params.pageSize, 20)} />}>
        <RedirectsTable params={params} />
      </Suspense>
    </>
  );
}
