import { notFound, permanentRedirect, redirect } from "next/navigation";
import { connection } from "next/server";
import { findRedirect } from "@/lib/data/search";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { decodeSegment } from "@/lib/slug";

export const instant = false;

/** Deeper legacy paths (/jet-popup/leader/, /parent/attachment/ …): honour the redirects table, otherwise 404. */
export default async function LegacyPath({ params }: PageProps<"/[lang]/[slug]/[...rest]">) {
  await connection();
  const { locale } = await getI18n();
  const { slug, rest } = await params;
  const path = `/${[slug, ...rest].map(decodeSegment).join("/")}/`;
  const target = await findRedirect(path);
  if (!target) notFound();
  const localizedTarget = localizePath(target.toPath, locale);
  if (target.statusCode === 302 || target.statusCode === 307) redirect(localizedTarget);
  permanentRedirect(localizedTarget);
}
