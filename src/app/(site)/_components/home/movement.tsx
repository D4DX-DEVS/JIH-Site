import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Images,
  Newspaper,
  PlayCircle,
  Users,
} from "lucide-react";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { CountUp } from "@/components/motion/count-up";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ArrowLink, SectionHeading } from "@/components/site/section-heading";
import { routes } from "@/lib/routes";
import type { HomeData } from "@/lib/data/home";
import type { PageCard } from "@/lib/data/pages";
import { OrgTabs } from "./org-tabs";

const ABOUT_LINKS = [
  ["History", "/history/"],
  ["Ideology", "/ideology/"],
  ["Objectives", "/objectives/"],
  ["Constitution", "/jamaat-e-islami-hind-kerala-constitution/"],
] as const;

/** What the movement is, with figures counted from the database (never typed in by hand). */
export function Movement({ data }: { data: HomeData }) {
  const stats = [
    {
      label: "Published articles",
      value: data.totals.posts,
      icon: Newspaper,
      href: "/news/",
    },
    {
      label: "Organisations and departments",
      value: data.totals.organisations,
      icon: Building2,
      href: "/departments/",
    },
    {
      label: "State leaders",
      value: data.totals.leaders,
      icon: Users,
      href: "/leaders/",
    },
    {
      label: "Photo galleries",
      value: data.totals.galleries,
      icon: Images,
      href: "/image-gallery/",
    },
    {
      label: "Videos",
      value: data.totals.videos,
      icon: PlayCircle,
      href: "/video-gallery/",
    },
  ].filter((s) => s.value > 0);

  return (
    <section
      aria-labelledby="movement-title"
      className="py-[var(--section-gap)]"
    >
      <div className="page-frame grid gap-12 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <SectionHeading
            id="movement-title"
            title="The movement in Kerala"
            lead={data.settings.site.tagline}
          />
          <Reveal delay={0.1}>
            <ul className="mt-8 flex flex-wrap gap-2">
              {ABOUT_LINKS.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group inline-flex min-h-11 items-center gap-1.5 rounded-full border border-navy/15 px-4 text-sm font-semibold text-navy transition-all duration-300 hover:-translate-y-0.5 hover:border-navy hover:bg-navy hover:text-white"
                  >
                    {label}
                    <ArrowUpRight
                      className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <Stagger
          as="ul"
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-7 lg:grid-cols-3"
        >
          {stats.map(({ label, value, icon: Icon, href }, i) => (
            <StaggerItem
              as="li"
              key={label}
              className={
                i === 0 ? "col-span-2 lg:col-span-1 lg:row-span-2" : undefined
              }
            >
              <Link
                href={href}
                className={`group card-lift relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-2xl border p-5 sm:p-6 ${
                  i === 0
                    ? "lattice border-transparent bg-navy text-white [--lattice-opacity:0.12]"
                    : "border-border/70 bg-white shadow-soft"
                }`}
              >
                <span
                  className={`inline-flex size-11 items-center justify-center rounded-xl ${i === 0 ? "bg-white/10 text-gold" : "bg-navy/[0.06] text-navy"}`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <CountUp
                    value={value}
                    className={`block font-heading font-extrabold leading-none tabular-nums ${i === 0 ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"}`}
                  />
                  <span
                    className={`mt-2 block text-sm ${i === 0 ? "text-on-navy-soft" : "text-ink-soft"}`}
                  >
                    {label}
                  </span>
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

const ORG_LIMIT = 8;

function OrgGrid({
  items,
  href,
  label,
}: {
  items: PageCard[];
  href: string;
  label: string;
}) {
  return (
    <>
      <Stagger
        as="ul"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {items.slice(0, ORG_LIMIT).map((item) => (
          <StaggerItem as="li" key={item.id}>
            <Link
              href={routes.page(item.slug)}
              className="group card-lift flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-white shadow-soft"
            >
              <span className="relative block aspect-[16/9] overflow-hidden bg-mist">
                {item.featuredMedia ? (
                  <ResponsiveImage
                    media={item.featuredMedia}
                    fallbackAlt=""
                    sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 100vw"
                    className="img-zoom size-full"
                  />
                ) : (
                  <span
                    className="lattice flex size-full items-center justify-center bg-navy font-heading text-3xl font-extrabold text-white/90"
                    aria-hidden="true"
                  >
                    {item.title.replace(/[^\p{L}]/gu, "").slice(0, 2)}
                  </span>
                )}
              </span>
              <span className="flex flex-1 items-start justify-between gap-3 p-5">
                <span className="min-w-0">
                  <span className="block font-heading text-lg font-bold leading-snug text-ink transition-colors group-hover:text-navy">
                    {item.title}
                  </span>
                  {item.summary ? (
                    <span className="mt-1.5 line-clamp-2 text-sm text-ink-soft">
                      {item.summary}
                    </span>
                  ) : null}
                </span>
                <ArrowUpRight
                  className="mt-1 size-5 shrink-0 text-ink-soft transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-maroon"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
      <div className="mt-8">
        <ArrowLink href={href}>
          {items.length > ORG_LIMIT
            ? `All ${items.length} ${label.toLowerCase()}`
            : `About our ${label.toLowerCase()}`}
        </ArrowLink>
      </div>
    </>
  );
}

/** Departments, feeder organisations and publications in tabs. */
export function Organisations({ data }: { data: HomeData }) {
  const tabs = [
    {
      value: "departments",
      label: "Departments",
      items: data.departments,
      href: "/departments/",
    },
    {
      value: "feeders",
      label: "Feeder organisations",
      items: data.feeders,
      href: "/feeder-organisation/",
    },
    {
      value: "publications",
      label: "Media and publications",
      items: data.publications,
      href: "/media-and-publications/",
    },
  ].filter((t) => t.items.length);
  if (!tabs.length) return null;
  return (
    <section
      aria-labelledby="orgs-title"
      className="lattice-ink relative bg-mist py-[var(--section-gap)] [--lattice-mask:linear-gradient(180deg,#000,transparent_60%)]"
    >
      <div className="page-frame">
        <SectionHeading
          id="orgs-title"
          title="Our organisations"
          lead="Departments, feeder organisations and the movement's media and publications."
        />
        <OrgTabs
          tabs={tabs.map((t) => ({
            value: t.value,
            label: t.label,
            count: t.items.length,
            content: <OrgGrid items={t.items} href={t.href} label={t.label} />,
          }))}
        />
      </div>
    </section>
  );
}
