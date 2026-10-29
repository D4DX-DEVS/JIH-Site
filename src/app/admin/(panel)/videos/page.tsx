import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { AdminEmptyState, PageHeader, StatusBadge, TableSkeleton } from "@/components/admin/admin-ui";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { videos } from "@/db/schema";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { likePattern } from "@/lib/pagination";
import { routes, youtubeThumb } from "@/lib/routes";

export const metadata: Metadata = { title: "Videos" };
export const instant = false;

const SORTS = ["publishedAt", "updatedAt", "title"] as const;
type Sort = (typeof SORTS)[number];
const SORT_COLUMNS = { publishedAt: videos.publishedAt, updatedAt: videos.updatedAt, title: videos.title } as const;

async function VideosTable({ params }: { params: AdminListParams<Sort> }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (params.status) where.push(eq(videos.status, params.status as "draft" | "published"));
  if (params.q) where.push(sql`lower(${videos.title}) like ${likePattern(params.q)} escape '\\'`);
  const condition = where.length ? and(...where) : undefined;
  const orderBy = params.order === "asc" ? asc(SORT_COLUMNS[params.sort]) : desc(SORT_COLUMNS[params.sort]);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: videos.id, title: videos.title, slug: videos.slug, youtubeId: videos.youtubeId, status: videos.status, publishedAt: videos.publishedAt })
      .from(videos)
      .where(condition)
      .orderBy(orderBy, desc(videos.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(videos).where(condition),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  if (!rows.length) {
    return params.q || params.status ? (
      <AdminEmptyState title="No videos match these filters" description="Change the search or filters." action={{ label: "Clear filters", href: "/admin/videos/" }} />
    ) : (
      <AdminEmptyState title="No videos yet" action={{ label: "Add the first video", href: "/admin/videos/new/" }} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">
                <span className="sr-only">Thumbnail</span>
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="hidden w-36 md:table-cell">Published</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  {/* eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail; next/image is unoptimized here */}
                  <img src={youtubeThumb(v.youtubeId)} alt="" loading="lazy" className="aspect-video w-20 rounded-md bg-muted object-cover" />
                </TableCell>
                <TableCell className="max-w-0 whitespace-normal">
                  <Link href={`/admin/videos/${v.id}/`} className="line-clamp-2 font-medium hover:underline">
                    {v.title}
                  </Link>
                  <a href={routes.video(v.slug)} target="_blank" rel="noopener" className="text-xs text-muted-foreground hover:underline">
                    View on site
                  </a>
                </TableCell>
                <TableCell>
                  <StatusBadge status={v.status} />
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{formatDate(v.publishedAt, "short")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DataPagination page={params.page} pageSize={params.pageSize} total={total} totalPages={totalPages} />
    </div>
  );
}

export default async function AdminVideosPage({ searchParams }: PageProps<"/admin/videos">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = parseAdminList(sp, { sorts: SORTS, defaultSort: "publishedAt", statuses: ["draft", "published"] });
  return (
    <>
      <PageHeader title="Videos" description="YouTube videos shown in the video gallery." action={{ label: "Add video", href: "/admin/videos/new/" }} />
      <ListToolbar
        searchPlaceholder="Search videos"
        filters={[{ name: "status", label: "Statuses", options: [{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }] }]}
        sorts={[{ value: "publishedAt", label: "Published" }, { value: "updatedAt", label: "Updated" }, { value: "title", label: "Title" }]}
        defaultSort="publishedAt"
      />
      <Suspense key={JSON.stringify(params)} fallback={<TableSkeleton columns={4} rows={params.pageSize > 20 ? 20 : params.pageSize} />}>
        <VideosTable params={params} />
      </Suspense>
    </>
  );
}
