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
import { RAIL_IDLE, RAIL_ITEM } from "./rail-styles";

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
    <nav aria-label="Admin" className="space-y-4">
      {ADMIN_NAV.map((section) => (
        <div key={section.group}>
          <p className="px-3 text-xs font-medium text-white/45">{section.group}</p>
          <ul className="mt-1 space-y-px">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin/" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(href.replace(/\/$/, ""));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(RAIL_ITEM, active ? "bg-sidebar-primary text-sidebar-primary-foreground" : RAIL_IDLE)}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
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

function RailFooter({ footer }: { footer?: ReactNode }) {
  return (
    <div className="mt-4 space-y-px border-t border-sidebar-border pt-3">
      <a href="/" target="_blank" rel="noopener" className={cn(RAIL_ITEM, RAIL_IDLE)}>
        <ExternalLink className="size-[18px]" aria-hidden="true" /> View website
      </a>
      {footer}
    </div>
  );
}

function RailLogo() {
  return (
    <Link href="/admin/" className="mb-5 flex items-center px-2 pt-1">
      <Image src="/brand/logo-white.png" alt="JIH Kerala admin" width={768} height={225} className="h-9 w-auto" loading="eager" />
    </Link>
  );
}

/** `footer` carries the sign-out form, which needs the server action from the layout. */
export function AdminSidebar({ footer }: { footer?: ReactNode }) {
  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <div className="no-scrollbar sticky top-4 flex max-h-[calc(100svh-2rem)] min-h-[calc(100svh-2rem)] flex-col overflow-y-auto rounded-2xl bg-sidebar p-4 text-sidebar-foreground">
        <RailLogo />
        <NavLinks />
        <div className="mt-auto">
          <RailFooter footer={footer} />
        </div>
      </div>
    </aside>
  );
}

export function AdminMobileNav({ footer }: { footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-muted lg:hidden" aria-label="Open admin menu">
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="admin-theme no-scrollbar w-72 overflow-y-auto border-0 bg-sidebar p-4 text-sidebar-foreground [&_[data-slot=sheet-close]]:text-white">
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">Admin menu</SheetTitle>
          <SheetDescription className="sr-only">Admin navigation</SheetDescription>
          <RailLogo />
        </SheetHeader>
        <NavLinks onNavigate={() => setOpen(false)} />
        <RailFooter footer={footer} />
      </SheetContent>
    </Sheet>
  );
}
