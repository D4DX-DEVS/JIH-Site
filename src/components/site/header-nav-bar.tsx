"use client";

import { useState, type ReactNode } from "react";
import type { NavLink } from "@/lib/data/navigation";
import { DesktopNav } from "./desktop-nav";
import { MobileNav } from "./mobile-nav";

/**
 * The menu row: the full menu where it fits, the menu button otherwise. Malayalam labels run long and
 * editors can rename items, so the switch follows the measured width, not only the breakpoint.
 */
export function HeaderNavBar({ items, search }: { items: NavLink[]; search: ReactNode }) {
  const [fits, setFits] = useState(true);
  return (
    <>
      <DesktopNav items={items} onFitChange={setFits} />
      <div className="flex shrink-0 items-center gap-1.5">
        {search}
        <MobileNav items={items} showOnDesktop={!fits} />
      </div>
    </>
  );
}
