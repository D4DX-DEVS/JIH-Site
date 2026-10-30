import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { NotFoundContent } from "./_components/not-found-content";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.notFound.title,
    robots: { index: false, follow: true },
  };
}

/** 404 raised inside the public site; the layout already supplies header and footer. */
export default function SiteNotFound() {
  return <NotFoundContent />;
}
