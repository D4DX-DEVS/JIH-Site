import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/site/section-heading";
import { listLeaders, type LeaderCard } from "@/lib/data/collections";
import type { PageDetail } from "@/lib/data/pages";
import type { LeaderGroup } from "@/db/schema";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { PageHero } from "../article-chrome";

export const LEADER_GROUP_TITLES: Record<LeaderGroup, string> = {
  ameer: "Ameer",
  "general-secretary": "General Secretary",
  "assistant-ameer": "Assistant Ameers",
  secretary: "Secretaries",
  shoora: "Shoora members",
};

const SPAN = { 1: "col-span-1", 2: "col-span-2", 3: "col-span-2 sm:col-span-3" } as const;
const INNER = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-2 sm:grid-cols-3" } as const;

function Photo({ leader, sizes, className }: { leader: LeaderCard; sizes: string; className?: string }) {
  return leader.photo ? (
    <ResponsiveImage media={leader.photo} fallbackAlt={leader.name} sizes={sizes} className={cn("img-zoom size-full object-top", className)} />
  ) : (
    <span className="lattice-ink flex size-full items-center justify-center bg-mist text-navy/40" aria-hidden="true">
      <UserRound className="size-16" />
    </span>
  );
}

function Portrait({ leader }: { leader: LeaderCard }) {
  return (
    <article className="group card-lift relative h-full overflow-hidden rounded-2xl border border-border/70 bg-white shadow-soft">
      <div className="aspect-[4/5] overflow-hidden bg-mist">
        <Photo leader={leader} sizes="(min-width: 1280px) 18vw, (min-width: 640px) 30vw, 50vw" />
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
function Featured({ leader, groupTitle }: { leader: LeaderCard; groupTitle: string }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <Reveal className="relative mx-auto w-full max-w-[18rem] sm:max-w-sm lg:mx-0 lg:max-w-md">
        <div aria-hidden="true" className="absolute -inset-3 -z-10 -rotate-2 rounded-[2rem] bg-gradient-to-br from-gold/40 via-maroon/20 to-navy/30" />
        <div className="group aspect-[4/5] overflow-hidden rounded-3xl bg-mist shadow-lift">
          <Photo leader={leader} sizes="(min-width: 1024px) 36vw, 90vw" />
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="inline-flex items-center rounded-full bg-maroon/10 px-3 py-1 text-sm font-semibold text-maroon">{groupTitle}</p>
        <h2 className="mt-4 break-words font-heading text-[clamp(2rem,1.2rem+3vw,3.75rem)] font-extrabold leading-[1.1] tracking-tight text-ink">{leader.name}</h2>
        {leader.roleTitle ? <p className="mt-3 text-xl text-ink-soft">{leader.roleTitle}</p> : null}
        <ButtonLink href={routes.leader(leader.slug)} variant="navy" className="mt-8">
          Read profile <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
        </ButtonLink>
      </Reveal>
    </div>
  );
}

export async function LeadersPage({ page }: { page: PageDetail }) {
  const leaders = await listLeaders();
  const groups = (Object.keys(LEADER_GROUP_TITLES) as LeaderGroup[])
    .map((key) => ({ key, title: LEADER_GROUP_TITLES[key], members: leaders.filter((l) => l.groupKey === key) }))
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
        lead={page.summary || "The state leadership of Jamaat-e-Islami Hind Kerala."}
        crumbs={[{ name: page.title, url: routes.page(page.slug) }]}
        aside={<p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white">{leaders.length} members of the leadership</p>}
      />
      {featured ? (
        <section aria-label={first.title} className="overflow-x-clip py-14 lg:py-20">
          <div className="page-frame">
          <Featured leader={featured} groupTitle={first.title} />
          </div>
        </section>
      ) : null}
      {bands.map((band, bi) => (
        <section
          key={band.map((g) => g.key).join("-")}
          aria-label={band.map((g) => g.title).join(", ")}
          className={cn("py-14 lg:py-20", bi % 2 === 0 ? "lattice-ink bg-mist [--lattice-mask:linear-gradient(180deg,#000,transparent_40%)]" : "bg-white")}
        >
          <div className={cn("page-frame", band.length > 1 && "grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5")}>
            {band.map((group) => {
              const n = group.members.length;
              // Small groups share a band; each spans as many columns as it has members.
              const span = band.length > 1 ? SPAN[Math.min(n, 3) as 1 | 2 | 3] : "";
              return (
                <div key={group.key} className={span}>
                  <Reveal className="mb-8 flex items-end justify-between gap-4 lg:mb-10">
                    <div>
                      <span aria-hidden="true" className="mb-4 block h-1 w-12 rounded-full bg-gradient-to-r from-gold to-maroon" />
                      <h2 id={`group-${group.key}`} className={cn("font-heading font-extrabold leading-tight text-ink", band.length > 1 ? "text-step-2" : "text-step-3")}>
                        {group.title}
                      </h2>
                    </div>
                    {band.length === 1 ? <p className="shrink-0 text-sm font-medium text-ink-soft">{n} {n === 1 ? "member" : "members"}</p> : null}
                  </Reveal>
                  <ul className={cn("grid gap-4 sm:gap-6", band.length > 1 ? INNER[Math.min(n, 3) as 1 | 2 | 3] : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5")}>
                    {group.members.map((l, i) => (
                      <Reveal key={l.id} as="li" delay={(i % 5) * 0.06}>
                        <Portrait leader={l} />
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
