import type { ReactNode } from "react";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import type { PageDetail } from "@/lib/data/pages";
import { getSettings } from "@/lib/data/settings";
import { getI18n } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";
import { PageHero } from "../article-chrome";
import { ContactForm } from "./contact-form";

const MAP_ORIGINS = /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed|^https:\/\/maps\.google\.[a-z.]+\/maps/;

function InfoCard({ icon, label, children, delay }: { icon: ReactNode; label: string; children: ReactNode; delay: number }) {
  return (
    <Reveal as="li" delay={delay}>
      <div className="group card-lift flex h-full gap-4 rounded-2xl border border-border/70 bg-white p-5 shadow-soft">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-maroon/10 text-maroon transition-colors duration-300 group-hover:bg-maroon group-hover:text-white">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
          <div className="mt-1 text-ink">{children}</div>
        </div>
      </div>
    </Reveal>
  );
}

export async function ContactPage({ page }: { page: PageDetail }) {
  const { locale, t } = await getI18n();
  const { contact } = await getSettings(locale);
  const map = MAP_ORIGINS.test(contact.mapEmbedUrl) ? contact.mapEmbedUrl : "";
  const link = "break-words font-medium text-navy underline-offset-4 hover:underline";
  return (
    <>
      <PageHero title={page.title} lead={t.contact.lead} crumbs={[{ name: page.title, url: routes.page(page.slug) }]} />
      <div className="lattice-ink bg-mist [--lattice-mask:linear-gradient(180deg,#000,transparent_50%)]">
        <div className="page-frame grid gap-10 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 lg:py-20">
          <section aria-labelledby="office-title" className="min-w-0">
            <h2 id="office-title" className="font-heading text-step-2 font-bold text-ink">
              {t.contact.officeTitle}
            </h2>
            <address className="mt-6 not-italic">
              <ul className="grid gap-4">
                <InfoCard icon={<MapPin className="size-5" aria-hidden="true" />} label={t.contact.address} delay={0}>
                  <p className="whitespace-pre-line leading-relaxed">
                    {contact.organisation ? <span className="block font-semibold">{contact.organisation}</span> : null}
                    {contact.postBox ? `${contact.postBox}\n` : ""}
                    {contact.address}
                  </p>
                </InfoCard>
                {contact.phone ? (
                  <InfoCard icon={<Phone className="size-5" aria-hidden="true" />} label={t.contact.phone} delay={0.06}>
                    <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className={link}>
                      {contact.phone}
                    </a>
                  </InfoCard>
                ) : null}
                {contact.email ? (
                  <InfoCard icon={<Mail className="size-5" aria-hidden="true" />} label={t.contact.email} delay={0.12}>
                    <a href={`mailto:${contact.email}`} className={`${link} break-all`}>
                      {contact.email}
                    </a>
                  </InfoCard>
                ) : null}
                {contact.website ? (
                  <InfoCard icon={<Globe className="size-5" aria-hidden="true" />} label={t.contact.website} delay={0.18}>
                    <a href={contact.website} target="_blank" rel="noopener noreferrer" className={`${link} break-all`}>
                      {contact.website.replace(/^https?:\/\//, "")}
                      <span className="sr-only"> {t.common.newTab}</span>
                    </a>
                  </InfoCard>
                ) : null}
              </ul>
            </address>
            {map ? (
              <Reveal delay={0.1} className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-white shadow-soft">
                <iframe src={map} title={t.contact.map(contact.address)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="aspect-[4/3] w-full" />
              </Reveal>
            ) : null}
          </section>
          <section aria-labelledby="message-title" className="min-w-0 self-start">
            <Reveal delay={0.08} className="rounded-3xl border border-border/70 bg-white p-6 shadow-lift sm:p-8 lg:p-10">
            <h2 id="message-title" className="font-heading text-step-2 font-bold text-ink">
              {t.contact.messageTitle}
            </h2>
            <p className="mt-2 text-ink-soft">{t.contact.messageLead}</p>
            <div className="mt-6">
              <ContactForm />
            </div>
            </Reveal>
          </section>
        </div>
      </div>
    </>
  );
}
