/* eslint-disable @next/next/no-img-element -- admin thumbnails from R2 with stored variants; next/image is unoptimized here */
import type { Metadata } from "next";
import { Suspense } from "react";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/admin-ui";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDb } from "@/db/client";
import { media } from "@/db/schema";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/auth/session";
import { formatBytes } from "@/lib/format";
import { pickVariant } from "@/lib/media-url";
import { likePattern } from "@/lib/pagination";
import { deleteMediaAction } from "./actions";
import { MediaDetailsDialog } from "./media-details-dialog";
import { UploadButton } from "./upload-button";

export const metadata: Metadata = { title: "Media library" };
export const instant = false;

const SORTS = ["createdAt", "title", "sizeBytes"] as const;
type Sort = (typeof SORTS)[number];
const KINDS = ["image", "document"] as const;
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5";

function MediaGridSkeleton({ count }: { count: number }) {
  return (
    <div role="status" aria-label="Loading" className={GRID}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function MediaGrid({ params, kind }: { params: AdminListParams<Sort>; kind: (typeof KINDS)[number] | null }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (kind) where.push(eq(media.kind, kind));
  if (params.q) where.push(sql`(lower(${media.title}) like ${likePattern(params.q)} escape '\\' or lower(${media.filename}) like ${likePattern(params.q)} escape '\\')`);
  const condition = where.length ? and(...where) : undefined;
  const column = { createdAt: media.createdAt, title: media.title, sizeBytes: media.sizeBytes }[params.sort];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(media)
      .where(condition)
      .orderBy(params.order === "asc" ? asc(column) : desc(column), desc(media.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(media).where(condition),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  if (!rows.length) {
    return params.q || kind ? (
      <AdminEmptyState title="No files match these filters" action={{ label: "Clear filters", href: "/admin/media/" }} />
    ) : (
      <AdminEmptyState title="The media library is empty" description="Use “Upload files” above to add images or PDFs." />
    );
  }

  return (
    <div className="space-y-4">
      <ul className={GRID}>
        {rows.map((m) => {
          const name = m.title || m.filename;
          return (
            <li key={m.id} className="flex h-full flex-col overflow-hidden rounded-lg border bg-card">
              <div className="relative aspect-square bg-muted">
                {m.kind === "image" ? (
                  <img src={pickVariant(m, 320)} alt={m.altText} className="size-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex size-full items-center justify-center">
                    <FileText className="size-10 text-muted-foreground" aria-hidden="true" />
                  </span>
                )}
                {m.kind === "image" && !m.altText ? (
                  <span className="absolute left-2 top-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">No alt text</span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="line-clamp-2 break-all text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(m.sizeBytes)}
                  {m.width && m.height ? ` · ${m.width}×${m.height}` : ""}
                  {m.wpId ? " · WordPress" : ""}
                </p>
                <div className="mt-auto flex justify-end gap-1 pt-2">
                  <MediaDetailsDialog
                    item={{
                      id: m.id, r2Key: m.r2Key, filename: m.filename, kind: m.kind, width: m.width, height: m.height, sizeLabel: formatBytes(m.sizeBytes),
                      variants: m.variants, title: m.title, altText: m.altText, caption: m.caption,
                    }}
                    trigger={
                      <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`Edit details of ${name}`}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                    }
                  />
                  <ConfirmAction
                    trigger={
                      <Button variant="ghost" size="icon" className="size-11 text-destructive sm:size-9" aria-label={`Delete ${name}`}>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    }
                    title={`Delete “${name}”?`}
                    description={
                      m.wpId
                        ? "The item leaves the library. The file was imported from WordPress, so it stays in storage for any article that still links to it."
                        : "The file and its resized copies are removed from storage. Links to it will stop working. Deletion is refused while a post, page, leader, gallery, poster or download uses it."
                    }
                    confirmLabel="Delete file"
                    action={deleteMediaAction.bind(null, m.id)}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <DataPagination page={params.page} pageSize={params.pageSize} total={total} totalPages={totalPages} />
    </div>
  );
}

export default async function AdminMediaPage({ searchParams }: PageProps<"/admin/media">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = parseAdminList(sp, { sorts: SORTS, defaultSort: "createdAt" });
  const kind = KINDS.find((k) => k === sp.kind) ?? null;
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Media library</h1>
          <p className="mt-1 text-sm text-muted-foreground">Images and documents stored in R2. JPEG, PNG, GIF, WebP, AVIF up to 10 MB; PDF up to 25 MB.</p>
        </div>
        <UploadButton />
      </div>
      <ListToolbar
        searchPlaceholder="Search by title or file name"
        filters={[{ name: "kind", label: "Types", options: [{ value: "image", label: "Images" }, { value: "document", label: "Documents" }] }]}
        sorts={[{ value: "createdAt", label: "Added" }, { value: "title", label: "Title" }, { value: "sizeBytes", label: "Size" }]}
        defaultSort="createdAt"
      />
      <Suspense key={JSON.stringify(params) + kind} fallback={<MediaGridSkeleton count={Math.min(params.pageSize, 20)} />}>
        <MediaGrid params={params} kind={kind} />
      </Suspense>
    </>
  );
}
