import { z } from "zod";

// Admin-side validation for the settings rows. The public reader (src/lib/data/settings.ts)
// stays lenient and fills defaults; these schemas are what the admin may write.

// Only web addresses: z.url() alone would also accept javascript: and data: URLs.
const optionalUrl = z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Enter a full address starting with https://" }).max(500)]).default("");

export const siteSettingsSchema = z
  .object({
    name: z.string().trim().max(120),
    nameEn: z.string().trim().max(120),
    shortName: z.string().trim().max(40),
    shortNameEn: z.string().trim().max(40),
    tagline: z.string().trim().max(400).default(""),
    taglineEn: z.string().trim().max(400).default(""),
    heroBannerMediaId: z.number().int().positive().nullable().default(null),
    copyright: z.string().trim().max(200).default(""),
    copyrightEn: z.string().trim().max(200).default(""),
  })
  .refine((v) => v.name.length >= 2 || v.nameEn.length >= 2, {
    message: "Enter a name in Malayalam or English",
    path: ["name"],
  })
  .refine((v) => v.shortName.length >= 2 || v.shortNameEn.length >= 2, {
    message: "Enter a short name in Malayalam or English",
    path: ["shortName"],
  });

export const seoSettingsSchema = z.object({
  homeTitle: z.string().trim().max(120, "Keep the title under 120 characters").default(""),
  homeTitleEn: z.string().trim().max(120, "Keep the title under 120 characters").default(""),
  defaultDescription: z.string().trim().max(300, "Keep the description under 300 characters").default(""),
  defaultDescriptionEn: z.string().trim().max(300, "Keep the description under 300 characters").default(""),
  ogImageMediaId: z.number().int().positive().nullable().default(null),
});

const MAP_EMBED = /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed|^https:\/\/maps\.google\.[a-z.]+\/maps/;

export const contactSettingsSchema = z.object({
  organisation: z.string().trim().max(200).default(""),
  organisationEn: z.string().trim().max(200).default(""),
  postBox: z.string().trim().max(120).default(""),
  postBoxEn: z.string().trim().max(120).default(""),
  address: z.string().trim().max(500).default(""),
  addressEn: z.string().trim().max(500).default(""),
  phone: z.string().trim().max(60).default(""),
  email: z.union([z.literal(""), z.email("Enter a valid email address").max(200)]).default(""),
  website: optionalUrl,
  mapEmbedUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => !v || MAP_EMBED.test(v), "Paste the src address of a Google Maps embed (https://www.google.com/maps/embed?…)")
    .default(""),
});

export const socialSettingsSchema = z.object({
  facebook: optionalUrl,
  twitter: optionalUrl,
  youtube: optionalUrl,
  instagram: optionalUrl,
});

export const ADMIN_SETTINGS_SCHEMAS = {
  site: siteSettingsSchema,
  seo: seoSettingsSchema,
  contact: contactSettingsSchema,
  social: socialSettingsSchema,
} as const;

export type AdminSettingsKey = keyof typeof ADMIN_SETTINGS_SCHEMAS;
export type SiteSettingsValues = z.infer<typeof siteSettingsSchema>;
export type SeoSettingsValues = z.infer<typeof seoSettingsSchema>;
export type ContactSettingsValues = z.infer<typeof contactSettingsSchema>;
export type SocialSettingsValues = z.infer<typeof socialSettingsSchema>;
