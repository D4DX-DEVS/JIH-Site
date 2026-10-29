import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { CornerDownRight, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminEmptyState, PageHeader } from "@/components/admin/admin-ui";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDb } from "@/db/client";
import { NAV_MENUS, navItems, type NavMenu } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { deleteNavItemAction } from "./actions";
import { MoveButtons } from "./move-buttons";
import { NavItemDialog } from "./nav-item-dialog";

export const metadata: Metadata = { title: "Navigation" };
export const instant = false;

type Row = typeof navItems.$inferSelect;

function ItemRow({ item, menu, parents, index, count, childCount }: { item: Row; menu: NavMenu; parents: Array<{ id: number; label: string }>; index: number; count: number; childCount: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:flex-nowrap">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {item.parentId ? <CornerDownRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
        <div className="min-w-0">
          <p className="truncate font-medium">{item.label}</p>
          <p className="truncate text-xs text-muted-foreground">{item.url || "No link (opens its sub-items)"}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <MoveButtons id={item.id} label={item.label} first={index === 0} last={index === count - 1} />
        <NavItemDialog
          menu={menu}
          parents={parents}
          item={{ id: item.id, label: item.label, url: item.url, parentId: item.parentId, hasChildren: childCount > 0 }}
          trigger={
            <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`Edit ${item.label}`}>
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
          }
        />
        <ConfirmAction
          trigger={
            <Button variant="ghost" size="icon" className="size-11 text-destructive sm:size-9" aria-label={`Remove ${item.label}`}>
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          }
          title={`Remove “${item.label}”?`}
          description={childCount ? `Its ${childCount} sub-items are removed with it. The pages they link to are not affected.` : "The link leaves the menu. The page it links to is not affected."}
          confirmLabel="Remove"
          action={deleteNavItemAction.bind(null, item.id)}
        />
      </div>
    </div>
  );
}

async function MenuTree({ menu }: { menu: NavMenu }) {
  const db = await getDb();
  const rows = await db.select().from(navItems).where(eq(navItems.menu, menu)).orderBy(asc(navItems.sortOrder), asc(navItems.id));
  const top = rows.filter((r) => !r.parentId);
  const childrenOf = (id: number) => rows.filter((r) => r.parentId === id);
  const parents = top.map((t) => ({ id: t.id, label: t.label }));

  return (
    <div className="space-y-4">
      {top.length ? (
        <ol className="divide-y rounded-lg border bg-card">
          {top.map((item, i) => {
            const children = childrenOf(item.id);
            return (
              <li key={item.id}>
                <ItemRow item={item} menu={menu} parents={parents} index={i} count={top.length} childCount={children.length} />
                {children.length ? (
                  <ol className="divide-y border-t bg-muted/30 pl-4 sm:pl-8">
                    {children.map((child, j) => (
                      <li key={child.id}>
                        <ItemRow item={child} menu={menu} parents={parents} index={j} count={children.length} childCount={0} />
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <AdminEmptyState title={`The ${menu} menu is empty`} description="Add the first link with the button below." />
      )}
      <NavItemDialog
        menu={menu}
        parents={parents}
        trigger={
          <Button variant="outline" className="h-11 sm:h-9">
            <Plus className="size-4" aria-hidden="true" /> Add menu item
          </Button>
        }
      />
    </div>
  );
}

function TreeSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="divide-y rounded-lg border">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

export default async function AdminNavigationPage({ searchParams }: PageProps<"/admin/navigation">) {
  await requireAdmin();
  const sp = await searchParams;
  const menu = NAV_MENUS.find((m) => m === sp.menu) ?? "header";
  return (
    <>
      <PageHeader title="Navigation" description="The links in the site header and footer. Header items with sub-items open as a dropdown." />
      <nav aria-label="Menus" className="flex gap-1 border-b">
        {NAV_MENUS.map((m) => (
          <Link
            key={m}
            href={m === "header" ? "/admin/navigation/" : `/admin/navigation/?menu=${m}`}
            aria-current={m === menu ? "page" : undefined}
            className="-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground"
          >
            {m === "header" ? "Header menu" : "Footer menu"}
          </Link>
        ))}
      </nav>
      <Suspense key={menu} fallback={<TreeSkeleton />}>
        <MenuTree menu={menu} />
      </Suspense>
    </>
  );
}
