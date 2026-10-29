import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUp, ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { RequestTime } from "@/components/shared/request-time";
import { Skeleton } from "@/components/ui/skeleton";
import { getNavigation } from "@/lib/data/navigation";
import { getSettings } from "@/lib/data/settings";

const EXPLORE = [
  { label: "News", href: "/news/" },
  { label: "Leaders", href: "/leaders/" },
  { label: "Image gallery", href: "/image-gallery/" },
  { label: "Videos", href: "/video-gallery/" },
  { label: "Downloads", href: "/downloads/" },
];

const linkClass = "inline-flex min-h-9 items-center text-on-navy-soft transition-colors duration-200 hover:text-white";

async function FooterBody() {
  const [settings, footerNav] = await Promise.all([getSettings(), getNavigation("footer")]);
  const { contact, social, site } = settings;
  const socials = [
    { href: social.facebook, label: "Facebook" },
    { href: social.twitter, label: "X (Twitter)" },
    { href: social.youtube, label: "YouTube" },
    { href: social.instagram, label: "Instagram" },
  ].filter((s) => s.href);

  return (
    <>
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        <div className="sm:col-span-2 lg:col-span-4">
          <Image src="/brand/logo-white.png" alt="Jamaat-e-Islami Hind Kerala" width={768} height={225} className="h-12 w-auto lg:h-14" />
          {site.tagline ? <p className="mt-5 max-w-sm leading-relaxed text-on-navy-soft">{site.tagline}</p> : null}
          {socials.length ? (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Social media">
              {socials.map(({ href, label }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 px-4 text-sm text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10"
                  >
                    {label}
                    <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-8 sm:col-span-2 lg:col-span-4">
          <nav aria-label="Footer">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Organisation</h2>
            <ul className="mt-4 space-y-1">
              {footerNav.map((item) => (
                <li key={item.id}>
                  <Link href={item.url || "/"} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Explore">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Explore</h2>
            <ul className="mt-4 space-y-1">
              {EXPLORE.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <address className="not-italic sm:col-span-2 lg:col-span-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Contact</h2>
          <ul className="mt-4 space-y-3 text-on-navy-soft">
            {contact.address ? (
              <li className="flex gap-3">
                <MapPin className="mt-1 size-4 shrink-0 text-gold" aria-hidden="true" />
                <span className="whitespace-pre-line">
                  {contact.organisation ? <span className="block text-white">{contact.organisation}</span> : null}
                  {contact.postBox ? `${contact.postBox}\n` : ""}
                  {contact.address}
                </span>
              </li>
            ) : null}
            {contact.phone ? (
              <li className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-gold" aria-hidden="true" />
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="transition-colors hover:text-white">
                  {contact.phone}
                </a>
              </li>
            ) : null}
            {contact.email ? (
              <li className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-gold" aria-hidden="true" />
                <a href={`mailto:${contact.email}`} className="break-all transition-colors hover:text-white">
                  {contact.email}
                </a>
              </li>
            ) : null}
          </ul>
        </address>
      </div>

      <div className="mt-12 flex flex-col-reverse items-start justify-between gap-4 border-t border-white/10 pt-6 text-sm text-on-navy-soft sm:flex-row sm:items-center lg:mt-16">
        <p>
          © {new Date().getFullYear()} {site.copyright || site.shortName}. All rights reserved.
        </p>
        <a
          href="#main"
          className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-white transition-all duration-300 hover:border-white/40 hover:bg-white/10"
        >
          Back to top <ArrowUp className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden="true" />
        </a>
      </div>
    </>
  );
}

function FooterSkeleton() {
  return (
    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12" aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-3 lg:col-span-4">
          <Skeleton className="h-5 w-40 opacity-20" />
          <Skeleton className="h-4 w-56 opacity-20" />
          <Skeleton className="h-4 w-48 opacity-20" />
        </div>
      ))}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="lattice relative overflow-hidden bg-navy-deep text-white [--lattice-mask:linear-gradient(0deg,#000,transparent_80%)] [--lattice-opacity:0.07]">
      <div aria-hidden="true" className="absolute -top-40 left-1/2 -z-10 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-navy/60 blur-3xl" />
      <div className="page-frame pb-8 pt-14 lg:pb-10 lg:pt-20">
        <Suspense fallback={<FooterSkeleton />}>
          <RequestTime>
            <FooterBody />
          </RequestTime>
        </Suspense>
      </div>
    </footer>
  );
}
