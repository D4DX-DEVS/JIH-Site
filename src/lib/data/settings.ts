import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { settings } from "@/db/schema";
import { getMediaByIds, type PublicMedia } from "./media";

const siteSchema = z.object({
  name: z.string().default("Jamaat-e-Islami Hind Kerala"),
  shortName: z.string().default("JIH Kerala"),
  tagline: z.string().default(""),
  logoMediaId: z.number().nullable().default(null),
  iconMediaId: z.number().nullable().default(null),
  /** Designed cover shown uncropped at the top of the homepage. */
  heroBannerMediaId: z.number().nullable().default(null),
  copyright: z.string().default(""),
});

const seoSchema = z.object({
  homeTitle: z.string().default(""),
  defaultDescription: z.string().default(""),
  ogImageMediaId: z.number().nullable().default(null),
});

const contactSchema = z.object({
  organisation: z.string().default(""),
  postBox: z.string().default(""),
  address: z.string().default(""),
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

export interface SiteSettings {
  site: z.infer<typeof siteSchema>;
  seo: z.infer<typeof seoSchema>;
  contact: z.infer<typeof contactSchema>;
  social: z.infer<typeof socialSchema>;
  logo: PublicMedia | null;
  icon: PublicMedia | null;
  ogImage: PublicMedia | null;
  banner: PublicMedia | null;
}

export async function getSettings(): Promise<SiteSettings> {
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
    ...parsed,
    logo: mediaMap.get(parsed.site.logoMediaId ?? -1) ?? null,
    icon: mediaMap.get(parsed.site.iconMediaId ?? -1) ?? null,
    ogImage: mediaMap.get(parsed.seo.ogImageMediaId ?? -1) ?? null,
    banner: mediaMap.get(parsed.site.heroBannerMediaId ?? -1) ?? null,
  };
}
