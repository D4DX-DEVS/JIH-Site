import type { Metadata } from "next";
import { connection } from "next/server";
import { Download, FileText } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/shared/states";
import { listDownloads } from "@/lib/data/collections";
import { formatBytes } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { langAttr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "../_components/article-chrome";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.downloads.title,
    description: t.downloads.description,
    path: "/downloads/",
    locale,
  });
}

export default async function DownloadsPage() {
  await connection();
  const { locale, t } = await getI18n();
  const items = (await listDownloads(locale)).filter((d) => d.file);
  return (
    <>
      <PageHero
        title={t.downloads.title}
        lead={t.downloads.lead}
        crumbs={[{ name: t.downloads.title, url: "/downloads/" }]}
        aside={items.length ? <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white">{t.downloads.count(items.length)}</p> : null}
      />
      <section aria-label={t.downloads.documents} className="lattice-ink bg-mist py-12 [--lattice-mask:linear-gradient(180deg,#000,transparent_50%)] lg:py-20">
        <div className="page-frame">
          {items.length ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((d, i) => {
                const kind = d.file!.mimeType === "application/pdf" ? "PDF" : (d.file!.mimeType.split("/").pop() ?? "File").toUpperCase();
                return (
                  <Reveal key={d.id} as="li" delay={(i % 3) * 0.08}>
                    <article lang={langAttr(d.lang, locale)} className="group card-lift relative flex h-full flex-col rounded-2xl border border-border/70 bg-white p-6 shadow-soft">
                      <div className="flex items-start justify-between gap-4">
                        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-maroon/10 text-maroon transition-colors duration-300 group-hover:bg-maroon group-hover:text-white">
                          <FileText className="size-7" aria-hidden="true" />
                        </span>
                        <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink-soft">
                          {kind} · {formatBytes(d.file!.sizeBytes)}
                        </span>
                      </div>
                      <h2 className="mt-5 font-heading text-lg font-bold leading-snug text-ink">{d.title}</h2>
                      {d.description ? <p className="mt-2 leading-relaxed text-ink-soft">{d.description}</p> : null}
                      <div className="mt-auto pt-6">
                      <a
                        href={mediaUrl(d.file!.r2Key)}
                        download
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-navy px-5 text-sm font-semibold text-white transition-all duration-300 after:absolute after:inset-0 after:rounded-2xl hover:bg-navy-deep"
                      >
                        <Download className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden="true" />
                        <span lang={langAttr(locale, d.lang)}>{t.downloads.download}</span>
                        <span className="sr-only">{d.title}</span>
                      </a>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </ul>
          ) : (
            <EmptyState title={t.downloads.empty} action={{ label: t.downloads.contactOffice, href: "/contact/" }} />
          )}
        </div>
      </section>
    </>
  );
}
