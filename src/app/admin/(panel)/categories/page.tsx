import type { Metadata } from "next";
import { Suspense } from "react";
import { asc, desc, sql } from "drizzle-orm";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AdminEmptyState, TableSkeleton } from "@/components/admin/admin-ui";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { categories, postCategories } from "@/db/schema";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/auth/session";
import { likePattern } from "@/lib/pagination";
import { routes } from "@/lib/routes";
import { deleteCategoryAction } from "./actions";
import { CategoryDialog } from "./category-dialog";

export const metadata: Metadata = { title: "Categories" };
export const instant = false;

const SORTS = ["name", "posts", "updatedAt"] as const;
type Sort = (typeof SORTS)[number];

async function CategoriesTable({ params }: { params: AdminListParams<Sort> }) {
  const db = await getDb();
  // Outer column named in full: inside the subquery a bare "id" would bind to the inner table.
  const postCount = sql<number>`(select count(*) from ${postCategories} pc where pc.category_id = "categories"."id")`;
  const condition = params.q ? sql`lower(${categories.name}) like ${likePattern(params.q)} escape '\\'` : undefined;
  const column = { name: categories.name, posts: postCount, updatedAt: categories.updatedAt }[params.sort];
  const [rows, [{ total }], all] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug, description: categories.description, parentId: categories.parentId, postCount })
      .from(categories)
      .where(condition)
      .orderBy(params.order === "asc" ? asc(column) : desc(column), asc(categories.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(categories).where(condition),
    db.select({ id: categories.id, name: categories.name, slug: categories.slug, parentId: categories.parentId }).from(categories).orderBy(asc(categories.name)),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const byId = new Map(all.map((c) => [c.id, c]));
  const pathOf = (slug: string, parentId: number | null) => {
    const parent = parentId ? byId.get(parentId) : undefined;
    return parent ? [parent.slug, slug] : [slug];
  };

  if (!rows.length) {
    return params.q ? (
      <AdminEmptyState title="No categories match this search" action={{ label: "Clear search", href: "/admin/categories/" }} />
    ) : (
      <AdminEmptyState title="No categories yet" description="Use “New category” above to add the first one." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Parent</TableHead>
              <TableHead className="w-20 text-right">Posts</TableHead>
              <TableHead className="w-28 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="max-w-0 whitespace-normal">
                  <p className="font-medium">{c.name}</p>
                  <a href={routes.category(pathOf(c.slug, c.parentId))} target="_blank" rel="noopener" className="break-all text-xs text-muted-foreground hover:underline">
                    /category/{pathOf(c.slug, c.parentId).join("/")}/
                  </a>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{c.parentId ? byId.get(c.parentId)?.name : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{c.postCount}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <CategoryDialog
                      category={{ id: c.id, name: c.name, slug: c.slug, description: c.description, parentId: c.parentId }}
                      parents={all}
                      trigger={
                        <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`Edit ${c.name}`}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                      }
                    />
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="icon" className="size-11 text-destructive sm:size-9" aria-label={`Delete ${c.name}`}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      }
                      title={`Delete “${c.name}”?`}
                      description={`The ${c.postCount} posts in it stay published but lose this category, its archive page returns “not found”, and subcategories move to the top level.`}
                      confirmLabel="Delete category"
                      action={deleteCategoryAction.bind(null, c.id)}
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

async function NewCategoryButton() {
  const db = await getDb();
  const all = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name));
  return (
    <CategoryDialog
      parents={all}
      trigger={
        <Button className="h-11 sm:h-9">
          <Plus className="size-4" aria-hidden="true" /> New category
        </Button>
      }
    />
  );
}

export default async function AdminCategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireAdmin();
  const params = parseAdminList(await searchParams, { sorts: SORTS, defaultSort: "name", defaultOrder: "asc" });
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">Groups for posts. Each has an archive at /category/…/</p>
        </div>
        <NewCategoryButton />
      </div>
      <ListToolbar
        searchPlaceholder="Search categories"
        sorts={[{ value: "name", label: "Name" }, { value: "posts", label: "Posts" }, { value: "updatedAt", label: "Updated" }]}
        defaultSort="name"
        defaultOrder="asc"
      />
      <Suspense key={JSON.stringify(params)} fallback={<TableSkeleton columns={4} rows={Math.min(params.pageSize, 20)} />}>
        <CategoriesTable params={params} />
      </Suspense>
    </>
  );
}
