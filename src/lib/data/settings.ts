import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { settings } from "@/db/schema";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { pickText } from "@/lib/i18n/content";
import { getMediaByIds, type PublicMedia } from "./media";

// Text settings come in pairs like the content columns: `name` is Malayalam, `nameEn` English.
const siteSchema = z.object({
  name: z.string().default(""),
  nameEn: z.string().default("Jamaat-e-Islami Hind Kerala"),
  shortName: z.string().default(""),
  shortNameEn: z.string().default("JIH Kerala"),
  tagline: z.string().default(""),
  taglineEn: z.string().default(""),
  logoMediaId: z.number().nullable().default(null),
  iconMediaId: z.number().nullable().default(null),
  /** Designed cover shown uncropped at the top of the homepage. */
  heroBannerMediaId: z.number().nullable().default(null),
  copyright: z.string().default(""),
  copyrightEn: z.string().default(""),
});

const seoSchema = z.object({
  homeTitle: z.string().default(""),
  homeTitleEn: z.string().default(""),
  defaultDescription: z.string().default(""),
  defaultDescriptionEn: z.string().default(""),
  ogImageMediaId: z.number().nullable().default(null),
});

const contactSchema = z.object({
  organisation: z.string().default(""),
  organisationEn: z.string().default(""),
  postBox: z.string().default(""),
  postBoxEn: z.string().default(""),
  address: z.string().default(""),
  addressEn: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  website: z.string().default(""),
  mapEmbedUrl: z.string().default(""),
});

const socialSchema = z.object({
  facebook: z.string().default(""),
  twitter: z.string().default(""),
  youtube: z.string().default(""),
  instagram: z.string().default(""),
});

export const SETTINGS_SCHEMAS = { site: siteSchema, seo: seoSchema, contact: contactSchema, social: socialSchema } as const;
export type SettingsKey = keyof typeof SETTINGS_SCHEMAS;

/** A settings group with each text pair resolved to one language. */
type Localized<T> = Omit<T, `${string}En`>;

export interface SiteSettings {
  site: Localized<z.infer<typeof siteSchema>>;
  seo: Localized<z.infer<typeof seoSchema>>;
  contact: Localized<z.infer<typeof contactSchema>>;
  social: z.infer<typeof socialSchema>;
  logo: PublicMedia | null;
  icon: PublicMedia | null;
  ogImage: PublicMedia | null;
  banner: PublicMedia | null;
}

/** Resolves every `key`/`keyEn` pair of a settings group to the reader's language (or the other one when empty). */
function localize<T extends Record<string, unknown>>(group: T, locale: Locale): Localized<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(group)) {
    if (key.endsWith("En")) continue;
    const en = group[`${key}En`];
    out[key] = typeof value === "string" && typeof en === "string" ? pickText(locale, value, en) : value;
  }
  return out as Localized<T>;
}

export async function getSettings(locale: Locale = DEFAULT_LOCALE): Promise<SiteSettings> {
  "use cache";
  cacheTag("settings");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db.select().from(settings);
  const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const parsed = {
    site: siteSchema.parse(raw.site ?? {}),
    seo: seoSchema.parse(raw.seo ?? {}),
    contact: contactSchema.parse(raw.contact ?? {}),
    social: socialSchema.parse(raw.social ?? {}),
  };
  const mediaMap = await getMediaByIds(db, [parsed.site.logoMediaId, parsed.site.iconMediaId, parsed.seo.ogImageMediaId, parsed.site.heroBannerMediaId]);
  return {
    site: localize(parsed.site, locale),
    seo: localize(parsed.seo, locale),
    contact: localize(parsed.contact, locale),
    social: parsed.social,
    logo: mediaMap.get(parsed.site.logoMediaId ?? -1) ?? null,
    icon: mediaMap.get(parsed.site.iconMediaId ?? -1) ?? null,
    ogImage: mediaMap.get(parsed.seo.ogImageMediaId ?? -1) ?? null,
    banner: mediaMap.get(parsed.site.heroBannerMediaId ?? -1) ?? null,
  };
}
