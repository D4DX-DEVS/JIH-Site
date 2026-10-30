import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LogOut, Search } from "lucide-react";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-nav";
import { getAdminSession } from "@/lib/auth/session";
import { logoutAction } from "../auth-actions";

/** Who is signed in, and the way out. Pages still guard themselves with requireAdmin. */
async function Account() {
  const session = await getAdminSession();
  const initial = session?.actor.charAt(0).toUpperCase() ?? "";
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
      {session ? (
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-[var(--admin-sky)] text-sm font-semibold text-[var(--admin-navy)]">
            {initial}
          </span>
          <span className="hidden max-w-56 truncate text-sm font-medium md:inline">{session.actor}</span>
        </div>
      ) : null}
      <form action={logoutAction}>
        <button
          type="submit"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" /> <span className="hidden sm:inline">Sign out</span>
          <span className="sr-only sm:hidden">Sign out</span>
        </button>
      </form>
    </div>
  );
}

// Shell: a white sidebar and a white 56px top bar over a cool grey canvas; each page lays its blocks
// on that canvas as white cards. Each page carries its own primary action in its title row, so the bar
// holds search and the account only. Every page and server action below checks the session itself
// (requireAdmin), so authorization never depends on this layout rendering.
export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-svh">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-5">
          <AdminMobileNav />
          <Link href="/admin/" className="shrink-0 lg:hidden">
            <Image src="/brand/logo-blue.png" alt="JIH Kerala admin" width={768} height={225} className="h-6 w-auto" />
          </Link>
          <form action="/admin/posts/" role="search" className="relative hidden w-full max-w-[400px] sm:block">
            <label htmlFor="admin-search" className="sr-only">Search posts</label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="admin-search"
              name="q"
              type="search"
              placeholder="Search posts…"
              className="h-9 w-full rounded-lg border border-border bg-muted/60 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-card focus-visible:ring-3 focus-visible:ring-ring/25"
            />
          </form>
          <Suspense fallback={<div className="ml-auto h-9 w-24" />}>
            <Account />
          </Suspense>
        </header>
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1280px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
