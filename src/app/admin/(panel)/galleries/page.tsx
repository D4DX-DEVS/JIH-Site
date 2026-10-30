import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { Images } from "lucide-react";
import { AdminEmptyState, PageHeader, StatusBadge, TableSkeleton } from "@/components/admin/admin-ui";
import { LanguageBadge } from "@/components/admin/language-badge";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { galleries, galleryCategories, galleryImages, media } from "@/db/schema";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { pickVariant } from "@/lib/media-url";
import { likePattern } from "@/lib/pagination";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Galleries" };
export const instant = false;

const SORTS = ["publishedAt", "updatedAt", "title"] as const;
type Sort = (typeof SORTS)[number];
const SORT_COLUMNS = { publishedAt: galleries.publishedAt, updatedAt: galleries.updatedAt, title: galleries.title } as const;

async function GalleriesTable({ params, category }: { params: AdminListParams<Sort>; category: number | null }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (params.status) where.push(eq(galleries.status, params.status as "draft" | "published"));
  if (category) where.push(eq(galleries.categoryId, category));
  if (params.q) {
    where.push(
      sql`(lower(${galleries.title}) like ${likePattern(params.q)} escape '\\') or (lower(${galleries.titleEn}) like ${likePattern(params.q)} escape '\\')`
    );
  }
  const condition = where.length ? and(...where) : undefined;
  const orderBy = params.order === "asc" ? asc(SORT_COLUMNS[params.sort]) : desc(SORT_COLUMNS[params.sort]);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: galleries.id, title: galleries.title, titleEn: galleries.titleEn, slug: galleries.slug, status: galleries.status, publishedAt: galleries.publishedAt, categoryName: galleryCategories.name,
        imageCount: sql<number>`(select count(*) from ${galleryImages} where ${galleryImages.galleryId} = ${galleries.id})`,
        cover: { r2Key: media.r2Key, width: media.width, height: media.height, altText: media.altText, variants: media.variants },
      })
      .from(galleries)
      .leftJoin(galleryCategories, eq(galleryCategories.id, galleries.categoryId))
      .leftJoin(media, eq(media.id, galleries.coverMediaId))
      .where(condition)
      .orderBy(orderBy, desc(galleries.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(galleries).where(condition),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  if (!rows.length) {
    return params.q || params.status || category ? (
      <AdminEmptyState title="No galleries match these filters" description="Change the search or filters." action={{ label: "Clear filters", href: "/admin/galleries/" }} />
    ) : (
      <AdminEmptyState title="No galleries yet" action={{ label: "Create the first gallery", href: "/admin/galleries/new/" }} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="admin-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">
                <span className="sr-only">Cover</span>
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden w-40 md:table-cell">Category</TableHead>
              <TableHead className="hidden w-24 lg:table-cell">Images</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="hidden w-36 lg:table-cell">Published</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  {g.cover?.r2Key ? (
                    // eslint-disable-next-line @next/next/no-img-element -- R2 media with stored variants; next/image is unoptimized here
                    <img src={pickVariant(g.cover, 300)} alt="" loading="lazy" className="h-11 w-16 rounded-md object-cover" />
                  ) : (
                    <span className="flex h-11 w-16 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Images className="size-5" aria-hidden="true" />
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-0 whitespace-normal">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/galleries/${g.id}/`} className="line-clamp-2 font-medium hover:underline">
                        {g.title || g.titleEn}
                      </Link>
                      <a href={routes.gallery(g.slug)} target="_blank" rel="noopener" className="text-xs text-muted-foreground hover:underline">
                        View on site
                      </a>
                    </div>
                    <LanguageBadge ml={!!g.title} en={!!g.titleEn} />
                  </div>
                </TableCell>
                <TableCell className="hidden text-sm md:table-cell">{g.categoryName ?? "None"}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground tabular-nums lg:table-cell">{g.imageCount}</TableCell>
                <TableCell>
                  <StatusBadge status={g.status} />
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatDate(g.publishedAt, "short")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DataPagination page={params.page} pageSize={params.pageSize} total={total} totalPages={totalPages} />
    </div>
  );
}

export default async function AdminGalleriesPage({ searchParams }: PageProps<"/admin/galleries">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = parseAdminList(sp, { sorts: SORTS, defaultSort: "publishedAt", statuses: ["draft", "published"] });
  const category = Number(sp.category) || null;
  const db = await getDb();
  const categoryOptions = await db.select({ id: galleryCategories.id, name: galleryCategories.name }).from(galleryCategories).orderBy(asc(galleryCategories.sortOrder), asc(galleryCategories.name));
  return (
    <>
      <PageHeader title="Galleries" description="Photo galleries and their images." action={{ label: "New gallery", href: "/admin/galleries/new/" }} />
      <ListToolbar
        searchPlaceholder="Search galleries"
        filters={[
          { name: "status", label: "Statuses", options: [{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }] },
          { name: "category", label: "Categories", options: categoryOptions.map((c) => ({ value: String(c.id), label: c.name })) },
        ]}
        sorts={[{ value: "publishedAt", label: "Published" }, { value: "updatedAt", label: "Updated" }, { value: "title", label: "Title" }]}
        defaultSort="publishedAt"
      />
      <Suspense key={JSON.stringify(params) + category} fallback={<TableSkeleton columns={6} rows={params.pageSize > 20 ? 20 : params.pageSize} />}>
        <GalleriesTable params={params} category={category} />
      </Suspense>
    </>
  );
}
