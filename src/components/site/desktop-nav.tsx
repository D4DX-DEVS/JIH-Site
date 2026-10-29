"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { NavLink } from "@/lib/data/navigation";
import { cn } from "@/lib/utils";

export function isActive(pathname: string, url: string): boolean {
  if (!url || /^https?:|^\/media\//.test(url)) return false;
  return url === "/" ? pathname === "/" : decodeURI(pathname).startsWith(decodeURI(url));
}

const isExternal = (url: string) => /^https?:|^\/media\//.test(url);

// Pill highlight on hover; the active page keeps a tinted pill.
const linkClass =
  "relative inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[0.9rem] font-medium 2xl:px-3.5 2xl:text-[0.95rem] text-ink transition-colors duration-200 hover:bg-mist hover:text-navy data-[active=true]:bg-navy/[0.06] data-[active=true]:text-navy data-[state=open]:bg-mist data-[state=open]:text-navy";

export function DesktopNav({ items }: { items: NavLink[] }) {
  const pathname = usePathname();
  // The logo already links home, so the Home item is left out of the desktop bar to save room.
  const visible = items.filter((i) => i.url !== "/" || i.children.length);
  return (
    <nav aria-label="Main" className="hidden min-w-0 flex-1 justify-center xl:flex">
      <ul className="flex items-center gap-0.5">
        {visible.map((item) =>
          item.children.length ? (
            <li key={item.id}>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger className={linkClass} data-active={item.children.some((c) => isActive(pathname, c.url))}>
                  {item.label}
                  <ChevronDown className="size-4 opacity-60 transition-transform duration-300 [[data-state=open]_&]:rotate-180" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={10} className="min-w-64 rounded-2xl border-border/70 p-2 shadow-lift">
                  {item.children.map((child) => (
                    <DropdownMenuItem key={child.id} asChild className="group min-h-11 cursor-pointer rounded-xl px-3 text-[0.95rem] focus:bg-mist focus:text-navy">
                      {isExternal(child.url) ? (
                        <a href={child.url} target={child.url.startsWith("http") ? "_blank" : undefined} rel="noopener">
                          <span className="transition-transform duration-200 group-focus:translate-x-0.5">{child.label}</span>
                        </a>
                      ) : (
                        <Link href={child.url || "#"} data-active={isActive(pathname, child.url)} className="data-[active=true]:font-semibold data-[active=true]:text-navy">
                          <span className="transition-transform duration-200 group-focus:translate-x-0.5">{child.label}</span>
                        </Link>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ) : (
            <li key={item.id}>
              <Link href={item.url || "/"} className={cn(linkClass)} data-active={isActive(pathname, item.url)} aria-current={isActive(pathname, item.url) ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
