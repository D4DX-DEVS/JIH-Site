import Image from "next/image";
import Link from "next/link";
import { LogOut, Plus, Search } from "lucide-react";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-nav";
import { RAIL_IDLE, RAIL_ITEM } from "@/components/admin/rail-styles";
import { cn } from "@/lib/utils";
import { logoutAction } from "../auth-actions";

function SignOut() {
  return (
    <form action={logoutAction}>
      <button type="submit" className={cn(RAIL_ITEM, RAIL_IDLE)}>
        <LogOut className="size-[18px]" aria-hidden="true" /> Sign out
      </button>
    </form>
  );
}

// The shell is static. Every page and server action below checks the session itself
// (requireAdmin), so authorization never depends on this layout rendering.
export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-svh gap-5 lg:p-4">
      <AdminSidebar footer={<SignOut />} />
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-card px-4 sm:px-5 lg:top-4 lg:rounded-2xl">
          <AdminMobileNav footer={<SignOut />} />
          <Link href="/admin/" className="shrink-0 lg:hidden">
            <Image src="/brand/logo-blue.png" alt="JIH Kerala admin" width={768} height={225} className="h-7 w-auto" />
          </Link>
          <form action="/admin/posts/" role="search" className="relative hidden max-w-md flex-1 sm:block">
            <label htmlFor="admin-search" className="sr-only">Search posts</label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="admin-search"
              name="q"
              type="search"
              placeholder="Search posts"
              className="h-10 w-full rounded-xl bg-muted pr-3 pl-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </form>
          <Link
            href="/admin/posts/new/"
            className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-[var(--admin-navy-deep)]"
          >
            <Plus className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">New post</span>
            <span className="sr-only sm:hidden">New post</span>
          </Link>
        </header>
        <main id="main" className="w-full flex-1 space-y-5 px-4 pb-8 sm:px-6 lg:px-0 lg:pb-4">
          {children}
        </main>
      </div>
    </div>
  );
}
