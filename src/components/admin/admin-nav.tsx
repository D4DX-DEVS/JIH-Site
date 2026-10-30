"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Activity, FileText, FolderTree, Images, Inbox, LayoutDashboard, Link2, Menu, Newspaper, Settings,
  Users, Video, Image as ImageIcon, Download, PanelTop, Megaphone, ExternalLink,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { RAIL_ACTIVE, RAIL_ICON, RAIL_ICON_ACTIVE, RAIL_IDLE, RAIL_ITEM } from "./rail-styles";

export const ADMIN_NAV = [
  { group: "Overview", items: [{ href: "/admin/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Content",
    items: [
      { href: "/admin/posts/", label: "Posts", icon: Newspaper },
      { href: "/admin/pages/", label: "Pages", icon: FileText },
      { href: "/admin/categories/", label: "Categories", icon: FolderTree },
      { href: "/admin/leaders/", label: "Leaders", icon: Users },
      { href: "/admin/galleries/", label: "Galleries", icon: Images },
      { href: "/admin/videos/", label: "Videos", icon: Video },
      { href: "/admin/posters/", label: "Posters", icon: Megaphone },
      { href: "/admin/downloads/", label: "Downloads", icon: Download },
      { href: "/admin/media/", label: "Media library", icon: ImageIcon },
    ],
  },
  {
    group: "Site",
    items: [
      { href: "/admin/navigation/", label: "Navigation", icon: PanelTop },
      { href: "/admin/redirects/", label: "Redirects", icon: Link2 },
      { href: "/admin/submissions/", label: "Submissions", icon: Inbox },
      { href: "/admin/settings/", label: "Settings & SEO", icon: Settings },
      { href: "/admin/activity/", label: "Activity log", icon: Activity },
    ],
  },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="space-y-5">
      {ADMIN_NAV.map((section) => (
        <div key={section.group}>
          <p className="mb-1.5 px-2 text-xs font-medium text-muted-foreground">{section.group}</p>
          <ul className="space-y-0.5">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin/" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(href.replace(/\/$/, ""));
              return (
                <li key={href}>
                  <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn(RAIL_ITEM, active ? RAIL_ACTIVE : RAIL_IDLE)}>
                    <span className={cn(RAIL_ICON, active && RAIL_ICON_ACTIVE)}>
                      <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function RailFooter() {
  return (
    <a href="/" target="_blank" rel="noopener" className={cn(RAIL_ITEM, RAIL_IDLE, "mt-5")}>
      <span className={RAIL_ICON}>
        <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </span>
      View website
    </a>
  );
}

/** The product's mark at the top of the rail. */
function RailLogo() {
  return (
    <Link href="/admin/" className="mb-6 flex h-10 items-center px-2">
      <Image src="/brand/logo-blue.png" alt="JIH Kerala admin" width={768} height={225} className="h-8 w-auto" loading="eager" />
    </Link>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 border-r border-border bg-sidebar lg:block">
      <div className="no-scrollbar sticky top-0 flex h-svh flex-col overflow-y-auto px-3 pt-4 pb-4">
        <RailLogo />
        <NavLinks />
        <div className="mt-auto">
          <RailFooter />
        </div>
      </div>
    </aside>
  );
}

export function AdminMobileNav({ footer }: { footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-muted lg:hidden" aria-label="Open admin menu">
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="admin-theme no-scrollbar w-72 overflow-y-auto border-0 bg-sidebar px-3 pt-4 pb-4 text-sidebar-foreground">
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">Admin menu</SheetTitle>
          <SheetDescription className="sr-only">Admin navigation</SheetDescription>
          <RailLogo />
        </SheetHeader>
        <NavLinks onNavigate={() => setOpen(false)} />
        <RailFooter />
        {footer}
      </SheetContent>
    </Sheet>
  );
}
