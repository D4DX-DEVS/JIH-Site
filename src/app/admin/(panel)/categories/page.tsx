import type { Metadata } from "next";
import { Suspense } from "react";
import { asc, desc, sql } from "drizzle-orm";
import { FolderOpen, FolderTree, Layers, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminEmptyState, ListPanel, PageHeader, StatCards, TableSkeleton } from "@/components/admin/admin-ui";
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
      .select({ id: categories.id, name: categories.name, nameEn: categories.nameEn, slug: categories.slug, description: categories.description, descriptionEn: categories.descriptionEn, parentId: categories.parentId, postCount })
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
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">Name</TableHead>
              <TableHead className="hidden md:table-cell">Parent</TableHead>
              <TableHead className="w-24 text-right">Posts</TableHead>
              <TableHead className="w-28">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="max-w-0 whitespace-normal">
                  <p className="font-medium">{c.name || c.nameEn}</p>
                  <a href={routes.category(pathOf(c.slug, c.parentId))} target="_blank" rel="noopener" className="mt-0.5 block truncate text-xs text-muted-foreground hover:text-foreground">
                    /category/{pathOf(c.slug, c.parentId).join("/")}/
                  </a>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {c.parentId ? <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{byId.get(c.parentId)?.name}</span> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{c.postCount}</TableCell>
                <TableCell className="py-2">
                  <div className="flex justify-end gap-1.5">
                    <CategoryDialog
                      category={{ id: c.id, name: c.name, nameEn: c.nameEn, slug: c.slug, description: c.description, descriptionEn: c.descriptionEn, parentId: c.parentId }}
                      parents={all}
                      trigger={
                        <Button variant="outline" size="icon" className="size-9 text-[var(--admin-navy)] hover:bg-[var(--admin-sky)] sm:size-8" aria-label={`Edit ${c.name}`}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                      }
                    />
                    <ConfirmAction
                      trigger={
                        <Button variant="outline" size="icon" className="size-9 text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive sm:size-8" aria-label={`Delete ${c.name}`}>
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
      <div className="border-t border-border px-4 py-3">
        <DataPagination page={params.page} pageSize={params.pageSize} total={total} totalPages={totalPages} />
      </div>
    </>
  );
}

/** The four counts an editor asks about first. */
async function CategoryStats() {
  const db = await getDb();
  const [{ total, topLevel, empty, posts }] = await db
    .select({
      total: sql<number>`count(*)`,
      topLevel: sql<number>`sum(case when ${categories.parentId} is null then 1 else 0 end)`,
      empty: sql<number>`sum(case when not exists (select 1 from ${postCategories} pc where pc.category_id = "categories"."id") then 1 else 0 end)`,
      posts: sql<number>`(select count(distinct post_id) from ${postCategories})`,
    })
    .from(categories);
  return (
    <StatCards
      items={[
        { label: "Categories", value: total ?? 0, hint: "Across the site", icon: FolderTree },
        { label: "Top level", value: topLevel ?? 0, hint: `${(total ?? 0) - (topLevel ?? 0)} nested`, icon: Layers },
        { label: "Without posts", value: empty ?? 0, hint: "Empty archive pages", icon: FolderOpen },
        { label: "Posts categorised", value: posts ?? 0, hint: "Posts with at least one category", icon: Newspaper, href: "/admin/posts/" },
      ]}
    />
  );
}

async function NewCategoryButton() {
  const db = await getDb();
  const all = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name));
  return (
    <CategoryDialog
      parents={all}
      trigger={
        <Button className="h-10 px-4 shadow-sm">
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
      <PageHeader title="Categories" description="Groups for posts. Each has an archive page at /category/…/">
        <NewCategoryButton />
      </PageHeader>
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="admin-card h-[88px]" />
            ))}
          </div>
        }
      >
        <CategoryStats />
      </Suspense>
      <ListPanel
        toolbar={
          <ListToolbar
            searchPlaceholder="Search categories"
            sorts={[{ value: "name", label: "Name" }, { value: "posts", label: "Posts" }, { value: "updatedAt", label: "Updated" }]}
            defaultSort="name"
            defaultOrder="asc"
          />
        }
      >
        <Suspense key={JSON.stringify(params)} fallback={<TableSkeleton columns={4} rows={Math.min(params.pageSize, 20)} />}>
          <CategoriesTable params={params} />
        </Suspense>
      </ListPanel>
    </>
  );
}
