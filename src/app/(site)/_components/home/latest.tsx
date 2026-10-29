import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PostCard } from "@/components/site/post-card";
import { ArrowLink, SectionHeading } from "@/components/site/section-heading";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { routes } from "@/lib/routes";
import type { HomeData } from "@/lib/data/home";

/** Latest Updates: the newest story large, the next four in a list beside it. */
export function LatestUpdates({ posts }: { posts: HomeData["latest"] }) {
  if (!posts.length) return null;
  const [lead, ...rest] = posts.slice(0, 5);
  return (
    <section id="latest" aria-labelledby="latest-title" className="scroll-mt-24 py-[var(--section-gap)]">
      <div className="page-frame">
        <SectionHeading id="latest-title" title="Latest Updates" lead="Statements, news and announcements from the state leadership." link={{ href: "/news/", label: "All news" }} />
        <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-12">
          <Reveal className="min-w-0 lg:col-span-7">
            <PostCard post={lead} variant="feature" headingLevel="h3" className="h-full" />
          </Reveal>
          <Reveal delay={0.1} className="min-w-0 lg:col-span-5">
            <Stagger as="ul" className="h-full space-y-1 rounded-2xl bg-mist p-2">
              {rest.map((post) => (
                <StaggerItem as="li" key={post.id} className="rounded-xl p-3 transition-colors duration-300 hover:bg-white sm:p-4">
                  <PostCard post={post} variant="row" />
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** News from the state, as cards (mirrors the WordPress "News" block). */
export function NewsGrid({ posts, categoryHref }: { posts: HomeData["news"]; categoryHref: string }) {
  if (!posts.length) return null;
  return (
    <section aria-labelledby="news-title" className="py-[var(--section-gap)]">
      <div className="page-frame">
        <SectionHeading id="news-title" title="News" lead="Reports, campaigns and events from across Kerala." link={{ href: categoryHref, label: "More state news" }} />
        <Stagger as="ul" className="mt-6 grid gap-6 sm:grid-cols-2 lg:mt-8 lg:grid-cols-3">
          {posts.map((post) => (
            <StaggerItem as="li" key={post.id}>
              <PostCard post={post} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/** Ameer Updates on the navy field: the Ameer's portrait beside his latest statements. */
export function AmeerUpdates({ ameer, posts }: { ameer: HomeData["ameer"]; posts: HomeData["ameerUpdates"] }) {
  if (!posts.length && !ameer) return null;
  return (
    <section aria-labelledby="ameer-title" className="lattice relative overflow-hidden bg-navy-deep py-[var(--section-gap)] text-white [--lattice-mask:radial-gradient(ellipse_at_left,#000_0%,transparent_65%)]">
      <div className="page-frame grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14">
        {ameer ? (
          <Reveal x={-24} y={0} className="hidden lg:col-span-4 lg:block">
            <Link href={routes.leader(ameer.slug)} className="group relative block">
              <span className="relative block overflow-hidden rounded-3xl bg-navy">
                {ameer.photo ? <ResponsiveImage media={ameer.photo} fallbackAlt={ameer.name} sizes="(min-width: 1024px) 28vw, 90vw" className="img-zoom aspect-[4/5] size-full" /> : <span className="lattice block aspect-[4/5]" />}
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-6">
                  <span className="block text-sm font-medium text-gold">{ameer.roleTitle || "Ameer"}</span>
                  <span className="mt-1 block font-heading text-2xl font-extrabold leading-tight">{ameer.name}</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-on-navy-soft transition-colors group-hover:text-white">
                    Profile <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </span>
              </span>
            </Link>
          </Reveal>
        ) : null}
        <div className={ameer ? "lg:col-span-8" : "lg:col-span-12"}>
          <SectionHeading id="ameer-title" tone="dark" title="Ameer Updates" lead="Statements and messages from the Ameer of Jamaat-e-Islami Hind, Kerala." />
          {ameer ? (
            <Link href={routes.leader(ameer.slug)} className="group mt-8 flex items-center gap-4 rounded-2xl bg-white/[0.07] p-3 transition-colors hover:bg-white/[0.12] lg:hidden">
              {ameer.photo ? (
                <ResponsiveImage media={ameer.photo} fallbackAlt={ameer.name} sizes="80px" className="size-20 shrink-0 rounded-xl object-cover object-top" />
              ) : null}
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gold">{ameer.roleTitle || "Ameer"}</span>
                <span className="block font-heading text-lg font-extrabold leading-tight">{ameer.name}</span>
                <span className="mt-1 inline-flex items-center gap-1.5 text-sm text-on-navy-soft group-hover:text-white">
                  Profile <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </span>
            </Link>
          ) : null}
          <Stagger as="ul" className="mt-6 grid gap-4 sm:grid-cols-2 lg:mt-8">
            {posts.map((post) => (
              <StaggerItem as="li" key={post.id} className="card-lift rounded-2xl bg-white p-4 text-ink">
                <PostCard post={post} variant="row" />
              </StaggerItem>
            ))}
          </Stagger>
          <div className="mt-8">
            <ArrowLink href="/category/ameer-updates/" tone="dark">
              All Ameer updates
            </ArrowLink>
          </div>
        </div>
      </div>
    </section>
  );
}
