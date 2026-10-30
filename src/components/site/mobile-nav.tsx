"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import { langAttr } from "@/lib/i18n/config";
import type { NavLink } from "@/lib/data/navigation";
import { cn } from "@/lib/utils";
import { isActive, isExternal } from "./nav-paths";

/** The menu button and sheet: below xl, and on wider screens when the full menu does not fit (`showOnDesktop`). */
export function MobileNav({ items, showOnDesktop = false }: { items: NavLink[]; showOnDesktop?: boolean }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const close = () => setOpen(false);

  const linkClass = (nested: boolean) =>
    cn(
      "flex min-h-12 items-center rounded-xl px-3 transition-colors hover:bg-mist hover:text-navy data-[active=true]:bg-navy/[0.06] data-[active=true]:text-navy",
      nested ? "text-base text-ink-soft" : "text-lg font-semibold text-ink",
    );

  const renderLink = (item: NavLink, nested = false) =>
    isExternal(item.url) ? (
      <a href={item.url} lang={langAttr(item.lang, locale)} className={linkClass(nested)} onClick={close} rel="noopener">
        {item.label}
      </a>
    ) : (
      <Link href={item.url || "/"} lang={langAttr(item.lang, locale)} className={linkClass(nested)} onClick={close} data-active={isActive(pathname, item.url)}>
        {item.label}
      </Link>
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn("inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-mist active:scale-95", !showOnDesktop && "xl:hidden")}
        title={t.header.menuTrigger}
      >
        <Menu className="size-6" aria-hidden="true" />
        <span className="sr-only">{t.header.menuTrigger}</span>
      </SheetTrigger>
      <SheetContent side="right" closeLabel={t.common.close} className="flex w-full max-w-sm flex-col gap-0 p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="sr-only">{t.header.mobileMenuLabel}</SheetTitle>
          <Image src="/brand/logo-blue.png" alt="" width={768} height={225} className="h-9 w-auto self-start" />
          <SheetDescription className="sr-only">{t.header.mobileMenuDescription}</SheetDescription>
        </SheetHeader>
        <nav aria-label={t.header.mainNav} className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {items.map((item, i) => (
              <motion.li
                key={item.id}
                initial={reduced ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: reduced ? 0 : 0.05 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                {item.children.length ? (
                  <>
                    <button
                      type="button"
                      lang={langAttr(item.lang, locale)}
                      aria-expanded={expanded === item.id}
                      onClick={() => setExpanded((e) => (e === item.id ? null : item.id))}
                      className="flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-lg font-semibold text-ink transition-colors hover:bg-mist"
                    >
                      {item.label}
                      <ChevronDown className={cn("size-5 opacity-60 transition-transform duration-300", expanded === item.id && "rotate-180")} aria-hidden="true" />
                    </button>
                    <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", expanded === item.id ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                      <ul className="overflow-hidden pl-3" inert={expanded !== item.id}>
                        {item.children.map((child) => (
                          <li key={child.id}>{renderLink(child, true)}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  renderLink(item)
                )}
              </motion.li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
