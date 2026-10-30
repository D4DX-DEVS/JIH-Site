"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import { langAttr } from "@/lib/i18n/config";
import type { NavLink } from "@/lib/data/navigation";
import { isActive, isExternal } from "./nav-paths";

// Time the menu stays open after the pointer leaves, so it can cross the gap between the item and its menu.
const CLOSE_DELAY_MS = 160;

interface NavDropdownProps {
  item: NavLink;
  /** Open state lives in the bar, so opening one menu closes the others. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerClass: string;
}

/** A header item with sub-items: opens when a mouse hovers it, and still on click, tap and keyboard. */
export function NavDropdown({ item, open, onOpenChange, triggerClass }: NavDropdownProps) {
  const { locale } = useI18n();
  const pathname = usePathname();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Opened by hovering: closing then leaves focus where it was instead of returning it to the item.
  const byHover = useRef(false);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const hover = (entering: boolean, e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    if (entering) {
      if (!open) byHover.current = true;
      onOpenChange(true);
    } else {
      closeTimer.current = setTimeout(() => onOpenChange(false), CLOSE_DELAY_MS);
    }
  };

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        lang={langAttr(item.lang, locale)}
        className={triggerClass}
        data-active={item.children.some((c) => isActive(pathname, c.url))}
        onPointerEnter={(e) => hover(true, e)}
        onPointerLeave={(e) => hover(false, e)}
        // Hovering already opened it; a click should not toggle it shut again.
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && open) e.preventDefault();
        }}
      >
        {item.label}
        <ChevronDown className="size-4 opacity-60 transition-transform duration-300 [[data-state=open]_&]:rotate-180" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        className="min-w-64 rounded-2xl border-border/70 p-2 shadow-lift"
        onPointerEnter={(e) => hover(true, e)}
        onPointerLeave={(e) => hover(false, e)}
        onCloseAutoFocus={(e) => {
          if (byHover.current) e.preventDefault();
          byHover.current = false;
        }}
      >
        {item.children.map((child) => (
          <DropdownMenuItem key={child.id} asChild className="group min-h-11 cursor-pointer rounded-xl px-3 text-[0.95rem] focus:bg-mist focus:text-navy">
            {isExternal(child.url) ? (
              <a href={child.url} target={child.url.startsWith("http") ? "_blank" : undefined} rel="noopener">
                <span lang={langAttr(child.lang, locale)} className="transition-transform duration-200 group-focus:translate-x-0.5">{child.label}</span>
              </a>
            ) : (
              <Link href={child.url || "#"} data-active={isActive(pathname, child.url)} className="data-[active=true]:font-semibold data-[active=true]:text-navy">
                <span lang={langAttr(child.lang, locale)} className="transition-transform duration-200 group-focus:translate-x-0.5">{child.label}</span>
              </Link>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
