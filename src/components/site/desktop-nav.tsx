"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import { langAttr } from "@/lib/i18n/config";
import type { NavLink } from "@/lib/data/navigation";
import { cn } from "@/lib/utils";
import { NavDropdown } from "./nav-dropdown";
import { isActive } from "./nav-paths";

// Width the menu button takes beside the search icon while it stands in for the bar (size-11 + gap-1.5).
const MENU_BUTTON_SLOT = 50;

// Pill highlight on hover; the active page keeps a tinted pill.
const linkClass =
  "relative inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-full px-1.5 text-[0.875rem] font-medium 2xl:px-3.5 2xl:text-[0.95rem] text-ink transition-colors duration-200 hover:bg-mist hover:text-navy data-[active=true]:bg-navy/[0.06] data-[active=true]:text-navy data-[state=open]:bg-mist data-[state=open]:text-navy";

/**
 * The full menu bar (from xl). `onFitChange` reports whether the items fit beside the logo; when they
 * do not, the bar hides itself (still laid out, so it can tell when it fits again) and the menu button
 * takes over.
 */
export function DesktopNav({ items, onFitChange }: { items: NavLink[]; onFitChange?: (fits: boolean) => void }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [fits, setFits] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const fitsRef = useRef(true);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const list = listRef.current;
    if (!nav || !list) return;
    // Below xl the bar is display:none (width 0) and the button shows anyway. While the button stands in,
    // it takes room from the bar; the bar comes back once it fits in the width the button would free.
    const check = () => {
      const room = nav.clientWidth + (fitsRef.current ? 0 : MENU_BUTTON_SLOT);
      fitsRef.current = nav.clientWidth === 0 || list.offsetWidth <= room;
      setFits(fitsRef.current);
    };
    const observer = new ResizeObserver(check);
    observer.observe(nav);
    observer.observe(list);
    check();
    return () => observer.disconnect();
  }, []);
  useEffect(() => onFitChange?.(fits), [fits, onFitChange]);

  // The logo already links home, so the Home item is left out of the desktop bar to save room.
  const visible = items.filter((i) => i.url !== "/" || i.children.length);
  return (
    <nav ref={navRef} aria-label={t.header.mainNav} className={cn("hidden min-w-0 flex-1 justify-center overflow-hidden xl:flex", !fits && "invisible")}>
      <ul ref={listRef} className="flex shrink-0 items-center gap-0.5">
        {visible.map((item) =>
          item.children.length ? (
            <li key={item.id}>
              <NavDropdown
                item={item}
                open={openId === item.id}
                // A late close from a menu the pointer already left must not shut the one now open.
                onOpenChange={(open) => setOpenId((cur) => (open ? item.id : cur === item.id ? null : cur))}
                triggerClass={linkClass}
              />
            </li>
          ) : (
            <li key={item.id}>
              <Link href={item.url || "/"} lang={langAttr(item.lang, locale)} className={cn(linkClass)} data-active={isActive(pathname, item.url)} aria-current={isActive(pathname, item.url) ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
