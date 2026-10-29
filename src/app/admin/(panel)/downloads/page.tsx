import type { Metadata } from "next";
import { Suspense } from "react";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminEmptyState, StatusBadge, TableSkeleton } from "@/components/admin/admin-ui";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { downloads } from "@/db/schema";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { pickerMediaMap } from "@/lib/admin/lookups";
import { requireAdmin } from "@/lib/auth/session";
import { formatBytes } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { likePattern } from "@/lib/pagination";
import { deleteDownloadAction } from "./actions";
import { DownloadDialog } from "./download-dialog";

export const metadata: Metadata = { title: "Downloads" };
export const instant = false;

const SORTS = ["sortOrder", "updatedAt", "title"] as const;
type Sort = (typeof SORTS)[number];

async function DownloadsTable({ params }: { params: AdminListParams<Sort> }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (params.status) where.push(eq(downloads.active, params.status === "active"));
  if (params.q) where.push(sql`lower(${downloads.title}) like ${likePattern(params.q)} escape '\\'`);
  const condition = where.length ? and(...where) : undefined;
  const column = { sortOrder: downloads.sortOrder, updatedAt: downloads.updatedAt, title: downloads.title }[params.sort];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(downloads)
      .where(condition)
      .orderBy(params.order === "asc" ? asc(column) : desc(column), asc(downloads.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(downloads).where(condition),
  ]);
  const files = await pickerMediaMap(db, rows.map((r) => r.mediaId));
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  if (!rows.length) {
    return params.q || params.status ? (
      <AdminEmptyState title="No downloads match these filters" action={{ label: "Clear filters", href: "/admin/downloads/" }} />
    ) : (
      <AdminEmptyState title="No downloads yet" description="Use “Add download” above to list a PDF on the Downloads page." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title and file</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="hidden w-24 text-right md:table-cell">Size</TableHead>
              <TableHead className="hidden w-20 text-right md:table-cell">Order</TableHead>
              <TableHead className="w-28 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => {
              const file = files.get(d.mediaId) ?? null;
              return (
                <TableRow key={d.id}>
                  <TableCell className="max-w-0 whitespace-normal">
                    <p className="line-clamp-2 font-medium">{d.title}</p>
                    {file ? (
                      <a href={mediaUrl(file.r2Key)} target="_blank" rel="noopener" className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:underline">
                        <FileText className="size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{file.r2Key.split("/").pop()}</span>
                      </a>
                    ) : (
                      <p className="text-xs text-destructive">File missing</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.active ? "active" : "hidden"} />
                  </TableCell>
                  <TableCell className="hidden text-right text-sm text-muted-foreground md:table-cell">{file ? formatBytes(file.sizeBytes) : "—"}</TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">{d.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <DownloadDialog
                        download={{ id: d.id, file, title: d.title, description: d.description, mediaId: d.mediaId, sortOrder: d.sortOrder, active: d.active }}
                        trigger={
                          <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`Edit ${d.title}`}>
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                        }
                      />
                      <ConfirmAction
                        trigger={
                          <Button variant="ghost" size="icon" className="size-11 text-destructive sm:size-9" aria-label={`Remove ${d.title}`}>
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        }
                        title={`Remove “${d.title}”?`}
                        description="It leaves the Downloads page. The file stays in the media library, so existing links to it keep working."
                        confirmLabel="Remove download"
                        action={deleteDownloadAction.bind(null, d.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <DataPagination page={params.page} pageSize={params.pageSize} total={total} totalPages={totalPages} />
    </div>
  );
}

async function AddDownloadButton() {
  const db = await getDb();
  const [{ max }] = await db.select({ max: sql<number | null>`max(${downloads.sortOrder})` }).from(downloads);
  return (
    <DownloadDialog
      nextSortOrder={(max ?? -1) + 1}
      trigger={
        <Button className="h-11 sm:h-9">
          <Plus className="size-4" aria-hidden="true" /> Add download
        </Button>
      }
    />
  );
}

export default async function AdminDownloadsPage({ searchParams }: PageProps<"/admin/downloads">) {
  await requireAdmin();
  const params = parseAdminList(await searchParams, { sorts: SORTS, defaultSort: "sortOrder", defaultOrder: "asc", statuses: ["active", "hidden"] });
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Downloads</h1>
          <p className="mt-1 text-sm text-muted-foreground">Documents listed on the public Downloads page.</p>
        </div>
        <AddDownloadButton />
      </div>
      <ListToolbar
        searchPlaceholder="Search downloads"
        filters={[{ name: "status", label: "Statuses", options: [{ value: "active", label: "Shown" }, { value: "hidden", label: "Hidden" }] }]}
        sorts={[{ value: "sortOrder", label: "Order" }, { value: "updatedAt", label: "Updated" }, { value: "title", label: "Title" }]}
        defaultSort="sortOrder"
        defaultOrder="asc"
      />
      <Suspense key={JSON.stringify(params)} fallback={<TableSkeleton columns={5} rows={Math.min(params.pageSize, 20)} />}>
        <DownloadsTable params={params} />
      </Suspense>
    </>
  );
}
