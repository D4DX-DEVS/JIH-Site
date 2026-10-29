import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { AdminEmptyState, PageHeader, StatusBadge, TableSkeleton } from "@/components/admin/admin-ui";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { categories, postCategories, posts } from "@/db/schema";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { likePattern } from "@/lib/pagination";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Posts" };
export const instant = false;

const SORTS = ["publishedAt", "updatedAt", "title"] as const;
type Sort = (typeof SORTS)[number];
const SORT_COLUMNS = { publishedAt: posts.publishedAt, updatedAt: posts.updatedAt, title: posts.title } as const;

async function PostsTable({ params, category }: { params: AdminListParams<Sort>; category: number | null }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (params.status) where.push(eq(posts.status, params.status as "draft" | "published"));
  if (params.q) where.push(sql`${posts.searchText} like ${likePattern(params.q)} escape '\\'`);
  if (category) where.push(inArray(posts.id, db.select({ id: postCategories.postId }).from(postCategories).where(eq(postCategories.categoryId, category))));
  const condition = where.length ? and(...where) : undefined;
  const orderBy = params.order === "asc" ? asc(SORT_COLUMNS[params.sort]) : desc(SORT_COLUMNS[params.sort]);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: posts.id, title: posts.title, slug: posts.slug, status: posts.status, publishedAt: posts.publishedAt, updatedAt: posts.updatedAt })
      .from(posts)
      .where(condition)
      .orderBy(orderBy, desc(posts.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(posts).where(condition),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  if (!rows.length) {
    return params.q || params.status || category ? (
      <AdminEmptyState title="No posts match these filters" description="Change the search or filters." action={{ label: "Clear filters", href: "/admin/posts/" }} />
    ) : (
      <AdminEmptyState title="No posts yet" action={{ label: "Write the first post", href: "/admin/posts/new/" }} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="hidden w-36 md:table-cell">Published</TableHead>
              <TableHead className="hidden w-36 lg:table-cell">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="max-w-0 whitespace-normal">
                  <Link href={`/admin/posts/${p.id}/`} className="line-clamp-2 font-medium hover:underline">
                    {p.title}
                  </Link>
                  <a href={routes.post(p.slug)} target="_blank" rel="noopener" className="text-xs text-muted-foreground hover:underline">
                    View on site
                  </a>
                </TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{formatDate(p.publishedAt, "short")}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatDate(p.updatedAt, "short")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DataPagination page={params.page} pageSize={params.pageSize} total={total} totalPages={totalPages} />
    </div>
  );
}

export default async function AdminPostsPage({ searchParams }: PageProps<"/admin/posts">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = parseAdminList(sp, { sorts: SORTS, defaultSort: "publishedAt", statuses: ["draft", "published"] });
  const category = Number(sp.category) || null;
  const db = await getDb();
  const categoryOptions = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder));
  return (
    <>
      <PageHeader title="Posts" description="News, statements and articles." action={{ label: "New post", href: "/admin/posts/new/" }} />
      <ListToolbar
        searchPlaceholder="Search posts"
        filters={[
          { name: "status", label: "Statuses", options: [{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }] },
          { name: "category", label: "Categories", options: categoryOptions.map((c) => ({ value: String(c.id), label: c.name })) },
        ]}
        sorts={[{ value: "publishedAt", label: "Published" }, { value: "updatedAt", label: "Updated" }, { value: "title", label: "Title" }]}
        defaultSort="publishedAt"
      />
      <Suspense key={JSON.stringify(params) + category} fallback={<TableSkeleton columns={4} rows={params.pageSize > 20 ? 20 : params.pageSize} />}>
        <PostsTable params={params} category={category} />
      </Suspense>
    </>
  );
}
