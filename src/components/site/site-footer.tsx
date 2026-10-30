import Image from "next/image";
import { Suspense } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { RequestTime } from "@/components/shared/request-time";
import { Skeleton } from "@/components/ui/skeleton";
import { getSettings } from "@/lib/data/settings";
import { getI18n } from "@/lib/i18n/server";
import { SocialIcon } from "./social-icons";

/**
 * Kept to what a visitor needs at the foot of the page: how to reach the office, where to follow the
 * movement, and the credit line. Every page link already sits in the header menu.
 */
async function FooterBody() {
  const { locale, t } = await getI18n();
  const { contact, social, site } = await getSettings(locale);
  const socials = (
    [
      { href: social.facebook, label: "Facebook", network: "facebook" },
      { href: social.instagram, label: "Instagram", network: "instagram" },
      { href: social.twitter, label: "X", network: "x" },
      { href: social.youtube, label: "YouTube", network: "youtube" },
    ] as const
  ).filter((s) => s.href);
  const address = [contact.postBox, contact.address].filter(Boolean).join(", ");

  return (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <Image src="/brand/logo-white.png" alt={t.meta.siteName} width={768} height={225} className="h-9 w-auto self-start lg:self-center" />

        <address className="grid gap-2 text-sm not-italic text-on-navy-soft lg:flex lg:flex-wrap lg:items-center lg:gap-x-6">
          {contact.phone ? (
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 transition-colors hover:text-white">
              <Phone className="size-4 shrink-0 text-gold" aria-hidden="true" />
              {contact.phone}
            </a>
          ) : null}
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 break-all transition-colors hover:text-white">
              <Mail className="size-4 shrink-0 text-gold" aria-hidden="true" />
              {contact.email}
            </a>
          ) : null}
          {address ? (
            <span className="inline-flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
              {address}
            </span>
          ) : null}
        </address>

        {socials.length ? (
          <ul className="flex gap-2" aria-label={t.footer.social}>
            {socials.map(({ href, label, network }) => (
              <li key={network}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} ${t.common.newTab}`}
                  title={label}
                  className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 hover:bg-white hover:text-navy"
                >
                  <SocialIcon network={network} className="size-[1.125rem]" />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm text-on-navy-soft">
        <p>
          © {new Date().getFullYear()} {site.copyright || site.shortName}. {t.footer.allRightsReserved}.
        </p>
        <a href="https://d4dx.co" target="_blank" rel="noopener" className="inline-flex min-h-10 items-center gap-2 transition-colors hover:text-white">
          {t.footer.poweredBy}
          <Image src="/brand/d4dx-logo-white.png" alt="D4DX" width={444} height={119} className="h-4 w-auto" />
          Innovations LLP
          <span className="sr-only"> {t.common.newTab}</span>
        </a>
      </div>
    </>
  );
}

function FooterSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" aria-hidden="true">
      <Skeleton className="h-9 w-32 opacity-20" />
      <Skeleton className="h-4 w-72 opacity-20" />
      <Skeleton className="h-4 w-56 opacity-20" />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-navy-deep text-white">
      <div className="page-frame pb-5 pt-8 lg:pt-10">
        <Suspense fallback={<FooterSkeleton />}>
          <RequestTime>
            <FooterBody />
          </RequestTime>
        </Suspense>
      </div>
    </footer>
  );
}
