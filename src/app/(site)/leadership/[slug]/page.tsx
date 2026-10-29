import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, UserRound } from "lucide-react";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/site/section-heading";
import { getLeaderBySlug } from "@/lib/data/collections";
import { htmlToText, truncateText } from "@/lib/content/sanitize";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo";
import { decodeSegment } from "@/lib/slug";
import { Breadcrumbs } from "../../_components/article-chrome";
import { LEADER_GROUP_TITLES } from "../../_components/templates/leaders-page";

export const instant = false;

async function resolve(slug: string) {
  await connection();
  return getLeaderBySlug(decodeSegment(slug));
}

export async function generateMetadata({ params }: PageProps<"/leadership/[slug]">): Promise<Metadata> {
  const leader = await resolve((await params).slug);
  if (!leader) return { title: "Profile not found", robots: { index: false } };
  return buildMetadata({
    title: `${leader.name}${leader.roleTitle ? `, ${leader.roleTitle}` : ""}`,
    description: truncateText(htmlToText(leader.bioHtml), 200),
    path: routes.leader(leader.slug),
    image: leader.photo,
  });
}

export default async function LeaderPage({ params }: PageProps<"/leadership/[slug]">) {
  const leader = await resolve((await params).slug);
  if (!leader) notFound();
  return (
    <article>
      <header className="lattice relative overflow-hidden bg-navy-deep text-white [--lattice-mask:radial-gradient(ellipse_at_top_right,#000_10%,transparent_70%)] [--lattice-opacity:0.12]">
        <div aria-hidden="true" className="absolute -right-40 -top-40 -z-10 size-[36rem] rounded-full bg-navy/70 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-48 -left-32 -z-10 size-[28rem] rounded-full bg-maroon/25 blur-3xl" />
        <div className="page-frame pb-14 pt-8 lg:pb-20 lg:pt-10">
          <Breadcrumbs items={[{ name: "Leaders", url: "/leaders/" }, { name: leader.name, url: routes.leader(leader.slug) }]} />
          <div className="mt-8 grid items-center gap-10 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:mt-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
            <Reveal className="relative mx-auto w-full max-w-xs sm:max-w-none">
              <div aria-hidden="true" className="absolute -inset-3 -z-10 rotate-3 rounded-[2rem] border border-white/15" />
              <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-navy shadow-lift ring-1 ring-white/10">
                {leader.photo ? (
                  <ResponsiveImage media={leader.photo} fallbackAlt={leader.name} sizes="(min-width: 1024px) 22rem, (min-width: 640px) 16rem, 80vw" priority className="size-full object-top" />
                ) : (
                  <span className="flex size-full items-center justify-center text-white/40" aria-hidden="true">
                    <UserRound className="size-20" />
                  </span>
                )}
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">{LEADER_GROUP_TITLES[leader.groupKey]}</p>
              <h1 className="mt-4 font-heading text-[clamp(2.25rem,1.4rem+3vw,4.25rem)] font-extrabold leading-[1.05] tracking-tight">{leader.name}</h1>
              {leader.roleTitle ? <p className="mt-3 text-xl text-on-navy-soft">{leader.roleTitle}</p> : null}
            </Reveal>
          </div>
        </div>
      </header>
      <div className="page-frame py-12 lg:py-16">
        <div className="mx-auto max-w-3xl">
          {leader.bioHtml ? <div className="prose-content" dangerouslySetInnerHTML={{ __html: leader.bioHtml }} /> : <p className="text-lg text-ink-soft">A profile has not been written yet.</p>}
          <ButtonLink href="/leaders/" variant="navy" className="mt-10">
            <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden="true" /> All leaders
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
