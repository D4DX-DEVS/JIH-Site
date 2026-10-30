import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { BackToTop } from "@/components/site/back-to-top";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Toaster } from "@/components/ui/sonner";
import { isLocale, LOCALES, OG_LOCALES } from "@/lib/i18n/config";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/site-url";
import { fontVariables } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${t.meta.siteName} | ${t.meta.shortName}`, template: `%s - ${t.meta.siteName}` },
    description: t.meta.description,
    applicationName: t.meta.shortName,
    openGraph: { siteName: t.meta.siteName, locale: OG_LOCALES[locale], type: "website" },
    twitter: { card: "summary_large_image", site: "@JIHkerala" },
  };
}

export const viewport: Viewport = {
  themeColor: "#071e7f",
  width: "device-width",
  initialScale: 1,
};

/** Root layout of the public site, once per language (/… is Malayalam, /en/… English). */
export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang} className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <noscript>
          {/* Scroll entrances start hidden; without script they must stay visible. */}
          <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        <I18nProvider locale={lang}>
          <SiteHeader />
          {/* tabIndex -1: the skip link and the back-to-top button move focus here. */}
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          <SiteFooter />
          <BackToTop />
        </I18nProvider>
        <Toaster position="top-center" richColors containerAriaLabel={dictionaries[lang].common.notifications} />
      </body>
    </html>
  );
}
