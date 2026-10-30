import { ArrowRight, UserRound } from "lucide-react";
import Link from "@/components/i18n/link";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/site/section-heading";
import { listLeaders, type LeaderCard } from "@/lib/data/collections";
import type { PageDetail } from "@/lib/data/pages";
import type { LeaderGroup } from "@/db/schema";
import { langAttr, type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { PageHero } from "../article-chrome";

/** English group names for the admin; the public pages take theirs from the dictionary (t.leaders.groups). */
export const LEADER_GROUP_TITLES: Record<LeaderGroup, string> = {
  ameer: "Ameer",
  "general-secretary": "General Secretary",
  "assistant-ameer": "Assistant Ameers",
  secretary: "Secretaries",
  shoora: "Shoora members",
};

function Photo({ leader, sizes, className }: { leader: LeaderCard; sizes: string; className?: string }) {
  return leader.photo ? (
    <ResponsiveImage media={leader.photo} fallbackAlt={leader.name} sizes={sizes} className={cn("img-zoom size-full object-top", className)} />
  ) : (
    <span className="lattice-ink flex size-full items-center justify-center bg-mist text-navy/40" aria-hidden="true">
      <UserRound className="size-16" />
    </span>
  );
}

function Portrait({ leader, locale }: { leader: LeaderCard; locale: Locale }) {
  return (
    <article lang={langAttr(leader.lang, locale)} className="group card-lift relative h-full overflow-hidden rounded-2xl border border-border/70 bg-white shadow-soft">
      <div className="aspect-[4/5] overflow-hidden bg-mist">
        <Photo leader={leader} sizes="(min-width: 640px) 224px, 50vw" />
      </div>
      <div className="p-4">
        <h3 className="font-heading text-base font-bold leading-snug text-ink transition-colors group-hover:text-navy sm:text-lg">
          <Link href={routes.leader(leader.slug)} className="after:absolute after:inset-0">
            {leader.name}
          </Link>
        </h3>
        {leader.roleTitle ? <p className="mt-1 text-sm text-ink-soft">{leader.roleTitle}</p> : null}
      </div>
    </article>
  );
}

/** The Ameer (or the first group's single member) shown large beside the title. */
function Featured({ leader, groupTitle, locale, readProfile }: { leader: LeaderCard; groupTitle: string; locale: Locale; readProfile: string }) {
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-16">
      <Reveal className="relative mx-auto w-full max-w-[16rem] sm:max-w-xs lg:w-80">
        <div aria-hidden="true" className="absolute -inset-3 -z-10 -rotate-2 rounded-[2rem] bg-gradient-to-br from-gold/40 via-maroon/20 to-navy/30" />
        <div className="group aspect-[4/5] overflow-hidden rounded-3xl bg-mist shadow-lift">
          <Photo leader={leader} sizes="(min-width: 640px) 320px, 256px" />
        </div>
      </Reveal>
      <Reveal delay={0.1} className="text-center lg:text-start">
        <p className="inline-flex items-center rounded-full bg-maroon/10 px-3 py-1 text-sm font-semibold text-maroon">{groupTitle}</p>
        <h2 lang={langAttr(leader.lang, locale)} className="mt-4 break-words font-heading text-[clamp(2rem,1.2rem+3vw,3.75rem)] font-extrabold leading-[1.1] tracking-tight text-ink">{leader.name}</h2>
        {leader.roleTitle ? <p className="mt-3 text-xl text-ink-soft">{leader.roleTitle}</p> : null}
        <ButtonLink href={routes.leader(leader.slug)} variant="navy" className="mt-8">
          {readProfile} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
        </ButtonLink>
      </Reveal>
    </div>
  );
}

export async function LeadersPage({ page }: { page: PageDetail }) {
  const { locale, t } = await getI18n();
  const leaders = await listLeaders(locale);
  const groups = (Object.keys(LEADER_GROUP_TITLES) as LeaderGroup[])
    .map((key) => ({ key, title: t.leaders.groups[key], members: leaders.filter((l) => l.groupKey === key) }))
    .filter((g) => g.members.length);
  const [first, ...rest] = groups;
  const featured = first && first.members.length === 1 ? first.members[0] : null;
  const gridGroups = featured ? rest : groups;
  // Consecutive groups of up to three members share one band so a lone card never sits in an empty section.
  const bands = gridGroups.reduce<Array<typeof gridGroups>>((acc, g) => {
    const last = acc[acc.length - 1];
    const small = g.members.length <= 3;
    if (small && last && last.every((x) => x.members.length <= 3) && last.reduce((t, x) => t + x.members.length, 0) + g.members.length <= 5) last.push(g);
    else acc.push([g]);
    return acc;
  }, []);

  return (
    <>
      <PageHero
        title={page.title}
        lead={page.summary || t.leaders.lead}
        crumbs={[{ name: page.title, url: routes.page(page.slug) }]}
        aside={<p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white">{t.leaders.total(leaders.length)}</p>}
      />
      {featured ? (
        <section aria-label={first.title} className="overflow-x-clip py-14 lg:py-20">
          <div className="page-frame">
          <Featured leader={featured} groupTitle={first.title} locale={locale} readProfile={t.leaders.readProfile} />
          </div>
        </section>
      ) : null}
      {bands.map((band, bi) => (
        <section
          key={band.map((g) => g.key).join("-")}
          aria-label={band.map((g) => g.title).join(", ")}
          className={cn("py-14 lg:py-20", bi % 2 === 0 ? "lattice-ink bg-mist [--lattice-mask:linear-gradient(180deg,#000,transparent_40%)]" : "bg-white")}
        >
          <div className={cn("page-frame", band.length > 1 && "flex flex-wrap items-start justify-center gap-x-10 gap-y-12 lg:gap-x-14")}>
            {band.map((group) => {
              const n = group.members.length;
              return (
                <div key={group.key}>
                  <Reveal className="mb-8 flex flex-col items-center gap-2 text-center lg:mb-10">
                    <div>
                      <span aria-hidden="true" className="mx-auto mb-4 block h-1 w-12 rounded-full bg-gradient-to-r from-gold to-maroon" />
                      <h2 id={`group-${group.key}`} className={cn("font-heading font-extrabold leading-tight text-ink", band.length > 1 ? "text-step-2" : "text-step-3")}>
                        {group.title}
                      </h2>
                    </div>
                    {band.length === 1 ? <p className="shrink-0 text-sm font-medium text-ink-soft">{t.leaders.members(n)}</p> : null}
                  </Reveal>
                  {/* Fixed card width + centred wrap: short rows sit in the middle instead of hugging the left edge. */}
                  <ul className="flex flex-wrap justify-center gap-4 sm:gap-6">
                    {group.members.map((l, i) => (
                      <Reveal key={l.id} as="li" delay={(i % 5) * 0.06} className="w-[calc(50%-0.5rem)] sm:w-52 xl:w-56">
                        <Portrait leader={l} locale={locale} />
                      </Reveal>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
