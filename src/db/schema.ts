import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
};

export const CONTENT_STATUSES = ["draft", "published"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** Responsive size variant of an image stored in R2. */
export interface MediaVariant {
  width: number;
  height: number;
  key: string;
}

export const media = sqliteTable(
  "media",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wpId: integer("wp_id").unique(),
    r2Key: text("r2_key").notNull().unique(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    kind: text("kind", { enum: ["image", "document", "other"] }).notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    title: text("title").notNull().default(""),
    altText: text("alt_text").notNull().default(""),
    caption: text("caption").notNull().default(""),
    sha256: text("sha256"),
    variants: text("variants", { mode: "json" }).$type<MediaVariant[]>().notNull().default(sql`'[]'`),
    legacyUrl: text("legacy_url").unique(),
    ...timestamps,
  },
  (t) => [index("media_kind_idx").on(t.kind, t.createdAt)],
);

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wpId: integer("wp_id").unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nameEn: text("name_en").notNull().default(""),
    description: text("description").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    parentId: integer("parent_id").references((): AnySQLiteColumn => categories.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("categories_parent_idx").on(t.parentId)],
);

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  wpId: integer("wp_id").unique(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ...timestamps,
});

/**
 * Content is bilingual. The plain columns hold Malayalam, the site's default language; the `…En`
 * columns hold English. Either may be empty: the public site then shows the other language with a
 * notice (see src/lib/i18n/content.ts), never both at once.
 */
const seoColumns = {
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
  seoTitleEn: text("seo_title_en").notNull().default(""),
  seoDescriptionEn: text("seo_description_en").notNull().default(""),
  ogImageId: integer("og_image_id").references(() => media.id, { onDelete: "set null" }),
};

export const posts = sqliteTable(
  "posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wpId: integer("wp_id").unique(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    titleEn: text("title_en").notNull().default(""),
    excerpt: text("excerpt").notNull().default(""),
    excerptEn: text("excerpt_en").notNull().default(""),
    contentHtml: text("content_html").notNull().default(""),
    contentHtmlEn: text("content_html_en").notNull().default(""),
    /** Lowercased text of both languages. */
    searchText: text("search_text").notNull().default(""),
    featuredMediaId: integer("featured_media_id").references(() => media.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull().default(""),
    status: text("status", { enum: CONTENT_STATUSES }).notNull().default("draft"),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    publishedAt: text("published_at"),
    ...seoColumns,
    ...timestamps,
  },
  (t) => [
    index("posts_status_published_idx").on(t.status, t.publishedAt),
    index("posts_featured_idx").on(t.isFeatured, t.publishedAt),
  ],
);

export const postCategories = sqliteTable(
  "post_categories",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.categoryId] }), index("post_categories_category_idx").on(t.categoryId)],
);

export const postTags = sqliteTable(
  "post_tags",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index("post_tags_tag_idx").on(t.tagId)],
);

/** Page templates. `hub` pages list the organisation pages of their `hubSection`. */
export const PAGE_TEMPLATES = ["default", "hub", "contact", "leaders", "news"] as const;
export const PAGE_SECTIONS = ["general", "about", "department", "publication", "feeder"] as const;
export type PageTemplate = (typeof PAGE_TEMPLATES)[number];
export type PageSection = (typeof PAGE_SECTIONS)[number];

export const pages = sqliteTable(
  "pages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wpId: integer("wp_id").unique(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    titleEn: text("title_en").notNull().default(""),
    summary: text("summary").notNull().default(""),
    summaryEn: text("summary_en").notNull().default(""),
    contentHtml: text("content_html").notNull().default(""),
    contentHtmlEn: text("content_html_en").notNull().default(""),
    /** Lowercased text of both languages. */
    searchText: text("search_text").notNull().default(""),
    featuredMediaId: integer("featured_media_id").references(() => media.id, { onDelete: "set null" }),
    template: text("template", { enum: PAGE_TEMPLATES }).notNull().default("default"),
    section: text("section", { enum: PAGE_SECTIONS }).notNull().default("general"),
    hubSection: text("hub_section", { enum: PAGE_SECTIONS }),
    externalUrl: text("external_url").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: CONTENT_STATUSES }).notNull().default("draft"),
    publishedAt: text("published_at"),
    ...seoColumns,
    ...timestamps,
  },
  (t) => [index("pages_section_idx").on(t.section, t.status, t.sortOrder)],
);

export const LEADER_GROUPS = ["ameer", "general-secretary", "assistant-ameer", "secretary", "shoora"] as const;
export type LeaderGroup = (typeof LEADER_GROUPS)[number];

export const leaders = sqliteTable(
  "leaders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wpId: integer("wp_id").unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nameEn: text("name_en").notNull().default(""),
    roleTitle: text("role_title").notNull().default(""),
    roleTitleEn: text("role_title_en").notNull().default(""),
    groupKey: text("group_key", { enum: LEADER_GROUPS }).notNull().default("shoora"),
    bioHtml: text("bio_html").notNull().default(""),
    bioHtmlEn: text("bio_html_en").notNull().default(""),
    photoMediaId: integer("photo_media_id").references(() => media.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: CONTENT_STATUSES }).notNull().default("published"),
    ...timestamps,
  },
  (t) => [index("leaders_group_idx").on(t.status, t.groupKey, t.sortOrder)],
);

export const galleryCategories = sqliteTable("gallery_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  wpId: integer("wp_id").unique(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const galleries = sqliteTable(
  "galleries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wpId: integer("wp_id").unique(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    titleEn: text("title_en").notNull().default(""),
    description: text("description").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    categoryId: integer("category_id").references(() => galleryCategories.id, { onDelete: "set null" }),
    coverMediaId: integer("cover_media_id").references(() => media.id, { onDelete: "set null" }),
    status: text("status", { enum: CONTENT_STATUSES }).notNull().default("published"),
    publishedAt: text("published_at"),
    ...timestamps,
  },
  (t) => [index("galleries_category_idx").on(t.status, t.categoryId, t.publishedAt)],
);

export const galleryImages = sqliteTable(
  "gallery_images",
  {
    galleryId: integer("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    mediaId: integer("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.galleryId, t.mediaId] }), index("gallery_images_order_idx").on(t.galleryId, t.sortOrder)],
);

export const videos = sqliteTable(
  "videos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wpId: integer("wp_id").unique(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    titleEn: text("title_en").notNull().default(""),
    youtubeId: text("youtube_id").notNull(),
    description: text("description").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    status: text("status", { enum: CONTENT_STATUSES }).notNull().default("published"),
    publishedAt: text("published_at"),
    ...timestamps,
  },
  (t) => [index("videos_published_idx").on(t.status, t.publishedAt)],
);

/** Homepage poster carousel. */
export const posters = sqliteTable(
  "posters",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mediaId: integer("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    titleEn: text("title_en").notNull().default(""),
    linkUrl: text("link_url").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index("posters_active_idx").on(t.active, t.sortOrder)],
);

export const downloads = sqliteTable("downloads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  titleEn: text("title_en").notNull().default(""),
  description: text("description").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  mediaId: integer("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const NAV_MENUS = ["header", "footer"] as const;
export type NavMenu = (typeof NAV_MENUS)[number];

export const navItems = sqliteTable(
  "nav_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    menu: text("menu", { enum: NAV_MENUS }).notNull(),
    label: text("label").notNull(),
    labelEn: text("label_en").notNull().default(""),
    url: text("url").notNull().default(""),
    parentId: integer("parent_id").references((): AnySQLiteColumn => navItems.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("nav_items_menu_idx").on(t.menu, t.parentId, t.sortOrder)],
);

export const redirects = sqliteTable("redirects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromPath: text("from_path").notNull().unique(),
  toPath: text("to_path").notNull(),
  statusCode: integer("status_code").notNull().default(301),
  source: text("source", { enum: ["migration", "admin"] }).notNull().default("admin"),
  hits: integer("hits").notNull().default(0),
  ...timestamps,
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<unknown>().notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
});

export const SUBMISSION_STATUSES = ["new", "read", "archived"] as const;

export const formSubmissions = sqliteTable(
  "form_submissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    form: text("form").notNull().default("contact"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    subject: text("subject").notNull().default(""),
    message: text("message").notNull(),
    ipHash: text("ip_hash").notNull().default(""),
    status: text("status", { enum: SUBMISSION_STATUSES }).notNull().default("new"),
    ...timestamps,
  },
  (t) => [index("form_submissions_status_idx").on(t.status, t.createdAt), index("form_submissions_ip_idx").on(t.ipHash, t.createdAt)],
);

export const activityLog = sqliteTable(
  "activity_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull().default(""),
    summary: text("summary").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (t) => [index("activity_log_created_idx").on(t.createdAt), index("activity_log_entity_idx").on(t.entityType, t.entityId)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 of the session token; the raw token only exists in the cookie. */
    id: text("id").primaryKey(),
    actor: text("actor").notNull(),
    expiresAt: text("expires_at").notNull(),
    ipHash: text("ip_hash").notNull().default(""),
    userAgent: text("user_agent").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (t) => [index("sessions_expires_idx").on(t.expiresAt)],
);

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ipHash: text("ip_hash").notNull(),
    success: integer("success", { mode: "boolean" }).notNull(),
    createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (t) => [index("login_attempts_ip_idx").on(t.ipHash, t.createdAt)],
);

export const MIGRATION_STATUSES = ["imported", "failed", "skipped", "unresolved"] as const;
export type MigrationStatus = (typeof MIGRATION_STATUSES)[number];

/** Ledger written by scripts/migrate/import.ts; makes the import idempotent and auditable. */
export const migrationItems = sqliteTable(
  "migration_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    sourceUrl: text("source_url").notNull().default(""),
    status: text("status", { enum: MIGRATION_STATUSES }).notNull(),
    targetTable: text("target_table").notNull().default(""),
    targetId: text("target_id").notNull().default(""),
    message: text("message").notNull().default(""),
    checksum: text("checksum").notNull().default(""),
    updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (t) => [uniqueIndex("migration_items_source_idx").on(t.sourceType, t.sourceId), index("migration_items_status_idx").on(t.status)],
);
