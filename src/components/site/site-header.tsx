import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Mail, MapPin, Phone, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestTime } from "@/components/shared/request-time";
import { getNavigation } from "@/lib/data/navigation";
import { getSettings } from "@/lib/data/settings";
import { DesktopNav } from "./desktop-nav";
import { HeaderShell } from "./header-shell";
import { MobileNav } from "./mobile-nav";

async function TopBar() {
  const { contact, social } = await getSettings();
  const socials = [
    { href: social.facebook, label: "Facebook" },
    { href: social.youtube, label: "YouTube" },
    { href: social.instagram, label: "Instagram" },
    { href: social.twitter, label: "X" },
  ].filter((s) => s.href);
  return (
    <div className="page-frame flex h-10 items-center justify-between gap-6 text-[0.8rem] text-on-navy-soft">
      <ul className="flex min-w-0 items-center gap-5">
        {contact.address ? (
          <li className="hidden min-w-0 items-center gap-1.5 xl:flex">
            <MapPin className="size-3.5 shrink-0 text-gold" aria-hidden="true" />
            <span className="truncate">{contact.address.split("\n").pop()}</span>
          </li>
        ) : null}
        {contact.phone ? (
          <li>
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-white">
              <Phone className="size-3.5 text-gold" aria-hidden="true" /> {contact.phone}
            </a>
          </li>
        ) : null}
        {contact.email ? (
          <li className="min-w-0">
            <a href={`mailto:${contact.email}`} className="inline-flex min-w-0 items-center gap-1.5 transition-colors hover:text-white">
              <Mail className="size-3.5 shrink-0 text-gold" aria-hidden="true" /> <span className="truncate">{contact.email}</span>
            </a>
          </li>
        ) : null}
      </ul>
      {socials.length ? (
        <ul className="flex shrink-0 items-center gap-4" aria-label="Social media">
          {socials.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">
                {s.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

async function HeaderNav() {
  const items = await getNavigation("header");
  return (
    <>
      <DesktopNav items={items} />
      <div className="flex items-center gap-1.5">
        <Link
          href="/search/"
          aria-label="Search the site"
          className="inline-flex size-11 items-center justify-center rounded-full text-ink transition-all duration-300 hover:bg-mist hover:text-navy active:scale-95"
        >
          <Search className="size-5" aria-hidden="true" />
        </Link>
        <Link
          href="/contact/"
          className="group hidden min-h-11 items-center gap-2 rounded-full bg-maroon px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgb(126_17_70/0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-maroon-deep active:translate-y-0 sm:inline-flex"
        >
          Contact
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
        <MobileNav items={items} />
      </div>
    </>
  );
}

function HeaderNavSkeleton() {
  return (
    <div className="flex items-center gap-6" aria-hidden="true">
      <div className="hidden gap-4 lg:flex">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-20 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-11 w-11 rounded-full lg:w-28" />
    </div>
  );
}

export function SiteHeader() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="hidden bg-navy-deep lg:block">
        <Suspense fallback={<div className="h-10" />}>
          <RequestTime>
            <TopBar />
          </RequestTime>
        </Suspense>
      </div>
      <HeaderShell>
        <div className="page-frame flex h-16 items-center justify-between gap-4 lg:h-[4.75rem]">
          <Link href="/" className="shrink-0 transition-opacity hover:opacity-85" aria-label="Jamaat-e-Islami Hind Kerala, home">
            <Image src="/brand/logo-blue.png" alt="Jamaat-e-Islami Hind Kerala" width={768} height={225} priority className="h-10 w-auto 2xl:h-12" />
          </Link>
          <Suspense fallback={<HeaderNavSkeleton />}>
            <RequestTime>
              <HeaderNav />
            </RequestTime>
          </Suspense>
        </div>
      </HeaderShell>
    </>
  );
}
