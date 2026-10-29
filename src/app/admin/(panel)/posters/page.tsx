/* eslint-disable @next/next/no-img-element -- admin thumbnails from R2 with stored variants; next/image is unoptimized here */
import type { Metadata } from "next";
import { Suspense } from "react";
import { asc, desc, eq, sql, type SQL, and } from "drizzle-orm";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AdminEmptyState, StatusBadge, TableSkeleton } from "@/components/admin/admin-ui";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { posters } from "@/db/schema";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { pickerMediaMap } from "@/lib/admin/lookups";
import { requireAdmin } from "@/lib/auth/session";
import { pickVariant } from "@/lib/media-url";
import { likePattern } from "@/lib/pagination";
import { deletePosterAction } from "./actions";
import { PosterDialog } from "./poster-dialog";

export const metadata: Metadata = { title: "Posters" };
export const instant = false;

const SORTS = ["sortOrder", "updatedAt", "title"] as const;
type Sort = (typeof SORTS)[number];

async function PostersTable({ params }: { params: AdminListParams<Sort> }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (params.status) where.push(eq(posters.active, params.status === "active"));
  if (params.q) where.push(sql`lower(${posters.title}) like ${likePattern(params.q)} escape '\\'`);
  const condition = where.length ? and(...where) : undefined;
  const column = { sortOrder: posters.sortOrder, updatedAt: posters.updatedAt, title: posters.title }[params.sort];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(posters)
      .where(condition)
      .orderBy(params.order === "asc" ? asc(column) : desc(column), asc(posters.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(posters).where(condition),
  ]);
  const images = await pickerMediaMap(db, rows.map((r) => r.mediaId));
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  if (!rows.length) {
    return params.q || params.status ? (
      <AdminEmptyState title="No posters match these filters" action={{ label: "Clear filters", href: "/admin/posters/" }} />
    ) : (
      <AdminEmptyState title="No posters yet" description="Use “Add poster” above. Posters show in a strip on the homepage." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Image</TableHead>
              <TableHead>Title and link</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="hidden w-20 text-right md:table-cell">Order</TableHead>
              <TableHead className="w-28 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const image = images.get(p.mediaId) ?? null;
              const name = p.title || `Poster #${p.id}`;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    {image ? <img src={pickVariant(image, 160)} alt="" className="h-16 w-12 rounded object-cover" loading="lazy" /> : <span className="text-xs text-destructive">Missing</span>}
                  </TableCell>
                  <TableCell className="max-w-0 whitespace-normal">
                    <p className="line-clamp-2 font-medium">{name}</p>
                    {p.linkUrl ? <p className="truncate text-xs text-muted-foreground">{p.linkUrl}</p> : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.active ? "active" : "hidden"} />
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">{p.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <PosterDialog
                        poster={{ id: p.id, image, mediaId: p.mediaId, title: p.title, linkUrl: p.linkUrl, sortOrder: p.sortOrder, active: p.active }}
                        trigger={
                          <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`Edit ${name}`}>
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                        }
                      />
                      <ConfirmAction
                        trigger={
                          <Button variant="ghost" size="icon" className="size-11 text-destructive sm:size-9" aria-label={`Remove ${name}`}>
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        }
                        title={`Remove “${name}”?`}
                        description="The poster leaves the homepage strip. Its image stays in the media library. To hide it for now, edit it and switch off “Show on the website”."
                        confirmLabel="Remove poster"
                        action={deletePosterAction.bind(null, p.id)}
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

async function AddPosterButton() {
  const db = await getDb();
  const [{ max }] = await db.select({ max: sql<number | null>`max(${posters.sortOrder})` }).from(posters);
  return (
    <PosterDialog
      nextSortOrder={(max ?? -1) + 1}
      trigger={
        <Button className="h-11 sm:h-9">
          <Plus className="size-4" aria-hidden="true" /> Add poster
        </Button>
      }
    />
  );
}

export default async function AdminPostersPage({ searchParams }: PageProps<"/admin/posters">) {
  await requireAdmin();
  const params = parseAdminList(await searchParams, { sorts: SORTS, defaultSort: "sortOrder", defaultOrder: "asc", statuses: ["active", "hidden"] });
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Posters</h1>
          <p className="mt-1 text-sm text-muted-foreground">Campaign posters shown on the homepage.</p>
        </div>
        <AddPosterButton />
      </div>
      <ListToolbar
        searchPlaceholder="Search posters"
        filters={[{ name: "status", label: "Statuses", options: [{ value: "active", label: "Shown" }, { value: "hidden", label: "Hidden" }] }]}
        sorts={[{ value: "sortOrder", label: "Order" }, { value: "updatedAt", label: "Updated" }, { value: "title", label: "Title" }]}
        defaultSort="sortOrder"
        defaultOrder="asc"
      />
      <Suspense key={JSON.stringify(params)} fallback={<TableSkeleton columns={5} rows={Math.min(params.pageSize, 20)} />}>
        <PostersTable params={params} />
      </Suspense>
    </>
  );
}
