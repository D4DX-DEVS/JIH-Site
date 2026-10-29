import { z } from "zod";
import { CONTENT_STATUSES, LEADER_GROUPS, PAGE_SECTIONS, PAGE_TEMPLATES } from "@/db/schema";
import { slugify } from "@/lib/slug";

// Shared by admin forms (client) and server actions (server). The server always re-parses.

const optionalId = z.number().int().positive().nullable();

/** A site path (/news/) or a full http(s) URL. "//host" and "/\host" are refused: browsers treat them as other sites. */
const isLinkTarget = (v: string) => /^\/(?![/\\])/.test(v) || /^https?:\/\//i.test(v);
const LINK_TARGET_MESSAGE = "Use a path like /news/ or a full URL";

const slugField = z
  .string()
  .trim()
  .max(120)
  .transform((s) => slugify(s));

const seoFields = {
  seoTitle: z.string().trim().max(120, "Keep the SEO title under 120 characters").default(""),
  seoDescription: z.string().trim().max(300, "Keep the description under 300 characters").default(""),
};

export const postSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(300),
  slug: slugField,
  status: z.enum(CONTENT_STATUSES),
  publishedAt: z.string().trim().refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date").default(""),
  excerpt: z.string().trim().max(600).default(""),
  contentHtml: z.string().max(400_000, "Content is too long").default(""),
  featuredMediaId: optionalId.default(null),
  categoryIds: z.array(z.number().int().positive()).max(20).default([]),
  isFeatured: z.boolean().default(false),
  ...seoFields,
});
export type PostFormValues = z.input<typeof postSchema>;

export const pageSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(300),
  slug: slugField,
  status: z.enum(CONTENT_STATUSES),
  summary: z.string().trim().max(1000).default(""),
  contentHtml: z.string().max(400_000, "Content is too long").default(""),
  featuredMediaId: optionalId.default(null),
  template: z.enum(PAGE_TEMPLATES),
  section: z.enum(PAGE_SECTIONS),
  hubSection: z.enum(PAGE_SECTIONS).nullable().default(null),
  externalUrl: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Enter a full URL starting with https://" }).max(500)]).default(""),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  ...seoFields,
});
export type PageFormValues = z.input<typeof pageSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: slugField,
  description: z.string().trim().max(500).default(""),
  parentId: optionalId.default(null),
});
export type CategoryFormValues = z.input<typeof categorySchema>;

export const leaderSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(200),
  slug: slugField,
  roleTitle: z.string().trim().max(200).default(""),
  groupKey: z.enum(LEADER_GROUPS),
  bioHtml: z.string().max(100_000).default(""),
  photoMediaId: optionalId.default(null),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  status: z.enum(CONTENT_STATUSES),
});
export type LeaderFormValues = z.input<typeof leaderSchema>;

export const gallerySchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(300),
  slug: slugField,
  description: z.string().trim().max(1000).default(""),
  categoryId: optionalId.default(null),
  coverMediaId: optionalId.default(null),
  imageIds: z.array(z.number().int().positive()).max(500).default([]),
  status: z.enum(CONTENT_STATUSES),
  publishedAt: z.string().trim().refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date").default(""),
});
export type GalleryFormValues = z.input<typeof gallerySchema>;

const YOUTUBE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})|^([A-Za-z0-9_-]{11})$/;
export function parseYoutubeId(input: string): string | null {
  const m = input.trim().match(YOUTUBE);
  return m ? (m[1] ?? m[2]) : null;
}

export const videoSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(300),
  slug: slugField,
  youtube: z.string().trim().refine((v) => !!parseYoutubeId(v), "Paste a YouTube link or 11-character video id"),
  description: z.string().trim().max(1000).default(""),
  status: z.enum(CONTENT_STATUSES),
  publishedAt: z.string().trim().refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date").default(""),
});
export type VideoFormValues = z.input<typeof videoSchema>;

export const posterSchema = z.object({
  mediaId: z.number().int().positive({ message: "Choose an image" }),
  title: z.string().trim().max(200).default(""),
  linkUrl: z.string().trim().max(500).refine((v) => !v || isLinkTarget(v), LINK_TARGET_MESSAGE).default(""),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  active: z.boolean().default(true),
});
export type PosterFormValues = z.input<typeof posterSchema>;

export const downloadSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(300),
  description: z.string().trim().max(500).default(""),
  mediaId: z.number().int().positive({ message: "Choose a file" }),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  active: z.boolean().default(true),
});
export type DownloadFormValues = z.input<typeof downloadSchema>;

export const redirectSchema = z.object({
  fromPath: z
    .string()
    .trim()
    .max(500)
    .regex(/^\/[^\s?#]*$/, "Start with / and leave out the domain and query string")
    .transform((p) => (p.endsWith("/") ? p : `${p}/`)),
  toPath: z.string().trim().max(500).refine(isLinkTarget, LINK_TARGET_MESSAGE),
  statusCode: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]),
});
export type RedirectFormValues = z.input<typeof redirectSchema>;

export const navItemSchema = z.object({
  menu: z.enum(["header", "footer"]),
  label: z.string().trim().min(1, "Label is required").max(80),
  url: z.string().trim().max(500).refine((v) => !v || isLinkTarget(v), LINK_TARGET_MESSAGE).default(""),
  parentId: optionalId.default(null),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
export type NavItemFormValues = z.input<typeof navItemSchema>;

export const mediaMetaSchema = z.object({
  title: z.string().trim().max(300).default(""),
  altText: z.string().trim().max(300).default(""),
  caption: z.string().trim().max(500).default(""),
});
export type MediaMetaValues = z.input<typeof mediaMetaSchema>;
