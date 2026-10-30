import Image from "next/image";
import { Suspense } from "react";
import { Mail, MapPin, Phone, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestTime } from "@/components/shared/request-time";
import Link from "@/components/i18n/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getNavigation } from "@/lib/data/navigation";
import { getSettings } from "@/lib/data/settings";
import { getI18n } from "@/lib/i18n/server";
import { HeaderNavBar } from "./header-nav-bar";
import { HeaderShell } from "./header-shell";
import { SocialIcon } from "./social-icons";

async function TopBar() {
  const { locale, t } = await getI18n();
  const { contact, social } = await getSettings(locale);
  const socials = (
    [
      { href: social.facebook, label: "Facebook", network: "facebook" },
      { href: social.instagram, label: "Instagram", network: "instagram" },
      { href: social.twitter, label: "X", network: "x" },
      { href: social.youtube, label: "YouTube", network: "youtube" },
    ] as const
  ).filter((s) => s.href);
  return (
    <div className="page-frame flex h-12 items-center justify-between gap-4 text-[0.8rem] text-on-navy-soft lg:h-10 lg:gap-6">
      {/* Phones get the language toggle and social links only; the contact details need the width of a desktop. */}
      <ul className="hidden min-w-0 items-center gap-5 lg:flex">
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
      <div className="flex shrink-0 items-center gap-3 max-lg:w-full max-lg:justify-between">
        <LanguageSwitcher tone="dark" />
        {socials.length ? (
        <ul className="flex shrink-0 items-center gap-1" aria-label={t.footer.social}>
          {socials.map((s) => (
            <li key={s.network}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${s.label} ${t.common.newTab}`}
                title={s.label}
                className="inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-white lg:size-8"
              >
                <SocialIcon network={s.network} className="size-3.5" />
              </a>
            </li>
          ))}
        </ul>
        ) : null}
      </div>
    </div>
  );
}

async function HeaderNav() {
  const { t } = await getI18n();
  // The organisation keeps the header menu in English on both sites (labels marked lang="en" on the
  // Malayalam one). The links still stay in the reader's language: the site's Link adds /en/ only there.
  const items = await getNavigation("header", "en");
  return (
    <HeaderNavBar
      items={items}
      search={
        <Link
          href="/search/"
          aria-label={t.header.searchAria}
          className="inline-flex size-11 items-center justify-center rounded-full text-ink transition-all duration-300 hover:bg-mist hover:text-navy active:scale-95"
        >
          <Search className="size-5" aria-hidden="true" />
        </Link>
      }
    />
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
      <Skeleton className="size-11 rounded-full" />
    </div>
  );
}

async function HeaderSkipLink() {
  const { t } = await getI18n();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
    >
      {t.skipLink}
    </a>
  );
}

export async function SiteHeader() {
  const { t } = await getI18n();
  return (
    <>
      <Suspense fallback={null}>
        <HeaderSkipLink />
      </Suspense>
      <div className="bg-navy-deep">
        <Suspense fallback={<div className="h-12 lg:h-10" />}>
          <RequestTime>
            <TopBar />
          </RequestTime>
        </Suspense>
      </div>
      <HeaderShell>
        <div className="page-frame flex h-16 items-center justify-between gap-4 lg:h-[4.75rem]">
          <Link href="/" className="shrink-0 transition-opacity hover:opacity-85" aria-label={t.header.homeLink}>
            <Image src="/brand/logo-blue.png" alt={t.meta.siteName} width={768} height={225} priority className="h-10 w-auto 2xl:h-12" />
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
