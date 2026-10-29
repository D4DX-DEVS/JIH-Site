import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { AdminEmptyState, PageHeader, StatusBadge, TableSkeleton } from "@/components/admin/admin-ui";
import { DataPagination } from "@/components/admin/data-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { PAGE_SECTIONS, pages, type PageSection } from "@/db/schema";
import { parseAdminList, type AdminListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { likePattern } from "@/lib/pagination";
import { routes } from "@/lib/routes";
import { SECTION_LABELS, TEMPLATE_LABELS } from "./labels";

export const metadata: Metadata = { title: "Pages" };
export const instant = false;

const SORTS = ["updatedAt", "title", "sortOrder"] as const;
type Sort = (typeof SORTS)[number];
const SORT_COLUMNS = { updatedAt: pages.updatedAt, title: pages.title, sortOrder: pages.sortOrder } as const;

async function PagesTable({ params, section }: { params: AdminListParams<Sort>; section: PageSection | null }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (params.status) where.push(eq(pages.status, params.status as "draft" | "published"));
  if (section) where.push(eq(pages.section, section));
  if (params.q) where.push(sql`${pages.searchText} like ${likePattern(params.q)} escape '\\'`);
  const condition = where.length ? and(...where) : undefined;
  const orderBy = params.order === "asc" ? asc(SORT_COLUMNS[params.sort]) : desc(SORT_COLUMNS[params.sort]);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: pages.id, title: pages.title, slug: pages.slug, status: pages.status, section: pages.section, template: pages.template, updatedAt: pages.updatedAt })
      .from(pages)
      .where(condition)
      .orderBy(orderBy, desc(pages.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(pages).where(condition),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  if (!rows.length) {
    return params.q || params.status || section ? (
      <AdminEmptyState title="No pages match these filters" description="Change the search or filters." action={{ label: "Clear filters", href: "/admin/pages/" }} />
    ) : (
      <AdminEmptyState title="No pages yet" action={{ label: "Create the first page", href: "/admin/pages/new/" }} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden w-40 md:table-cell">Section</TableHead>
              <TableHead className="hidden w-36 lg:table-cell">Template</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="hidden w-36 lg:table-cell">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="max-w-0 whitespace-normal">
                  <Link href={`/admin/pages/${p.id}/`} className="line-clamp-2 font-medium hover:underline">
                    {p.title}
                  </Link>
                  <a href={routes.page(p.slug)} target="_blank" rel="noopener" className="text-xs text-muted-foreground hover:underline">
                    View on site
                  </a>
                </TableCell>
                <TableCell className="hidden text-sm md:table-cell">{SECTION_LABELS[p.section]}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{TEMPLATE_LABELS[p.template]}</TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
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

export default async function AdminPagesPage({ searchParams }: PageProps<"/admin/pages">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = parseAdminList(sp, { sorts: SORTS, defaultSort: "updatedAt", statuses: ["draft", "published"] });
  const sectionRaw = typeof sp.section === "string" ? sp.section : "";
  const section = (PAGE_SECTIONS as readonly string[]).includes(sectionRaw) ? (sectionRaw as PageSection) : null;
  return (
    <>
      <PageHeader title="Pages" description="About pages, departments, organisations and other standalone pages." action={{ label: "New page", href: "/admin/pages/new/" }} />
      <ListToolbar
        searchPlaceholder="Search pages"
        filters={[
          { name: "status", label: "Statuses", options: [{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }] },
          { name: "section", label: "Sections", options: PAGE_SECTIONS.map((s) => ({ value: s, label: SECTION_LABELS[s] })) },
        ]}
        sorts={[{ value: "updatedAt", label: "Updated" }, { value: "title", label: "Title" }, { value: "sortOrder", label: "Order" }]}
        defaultSort="updatedAt"
      />
      <Suspense key={JSON.stringify(params) + section} fallback={<TableSkeleton columns={5} rows={params.pageSize > 20 ? 20 : params.pageSize} />}>
        <PagesTable params={params} section={section} />
      </Suspense>
    </>
  );
}
