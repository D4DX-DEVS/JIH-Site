import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/admin-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { getDb } from "@/db/client";
import { settings } from "@/db/schema";
import { pickerMedia } from "@/lib/admin/lookups";
import { requireAdmin } from "@/lib/auth/session";
import type { AdminSettingsKey } from "@/lib/validation/settings";
import { SettingsForm, type SettingsField } from "./settings-form";

export const metadata: Metadata = { title: "Settings & SEO" };
export const instant = false;

const GROUPS: Array<{ key: AdminSettingsKey; title: string; description: string; fields: SettingsField[] }> = [
  {
    key: "site",
    title: "Site details",
    description: "The organisation’s name as the site shows it, in Malayalam and English.",
    fields: [
      { name: "name", label: "Full name", kind: "text", hint: "Used in page titles and structured data.", bilingual: true },
      { name: "shortName", label: "Short name", kind: "text", hint: "Used where space is tight, e.g. the footer.", bilingual: true },
      { name: "tagline", label: "Tagline", kind: "textarea", hint: "Shown on the homepage.", dir: "auto", bilingual: true },
      { name: "heroBannerMediaId", label: "Homepage banner", kind: "image", hint: "Shown in full, never cropped, at the top of the homepage. A wide image of about 2560×1250 works best. Without one, event photographs are shown." },
      { name: "copyright", label: "Copyright holder", kind: "text", hint: "Footer line; the year is added automatically.", bilingual: true },
    ],
  },
  {
    key: "seo",
    title: "Search engines and sharing",
    description: "Defaults for the homepage. Each post and page has its own SEO fields.",
    fields: [
      { name: "homeTitle", label: "Homepage title", kind: "text", hint: "Leave empty to use the full name.", dir: "auto", bilingual: true },
      { name: "defaultDescription", label: "Homepage description", kind: "textarea", hint: "About 150 characters works best in search results.", dir: "auto", bilingual: true },
      { name: "ogImageMediaId", label: "Sharing image", kind: "image", hint: "Shown when the homepage is shared on social media. 1200×630 works best." },
    ],
  },
  {
    key: "contact",
    title: "Contact details",
    description: "Shown on the contact page and in the footer.",
    fields: [
      { name: "organisation", label: "Organisation", kind: "text", dir: "auto", bilingual: true },
      { name: "postBox", label: "Post box", kind: "text", bilingual: true },
      { name: "address", label: "Address", kind: "textarea", dir: "auto", bilingual: true },
      { name: "phone", label: "Phone", kind: "tel" },
      { name: "email", label: "Email", kind: "email" },
      { name: "website", label: "Website", kind: "url" },
      { name: "mapEmbedUrl", label: "Google Maps embed address", kind: "textarea", hint: "In Google Maps choose Share → Embed a map, and paste only the address inside src=\"…\"." },
    ],
  },
  {
    key: "social",
    title: "Social media",
    description: "Links in the footer. Leave a field empty to hide it.",
    fields: [
      { name: "facebook", label: "Facebook", kind: "url" },
      { name: "twitter", label: "X (Twitter)", kind: "url" },
      { name: "youtube", label: "YouTube", kind: "url" },
      { name: "instagram", label: "Instagram", kind: "url" },
    ],
  },
];

async function SettingsForms() {
  const db = await getDb();
  const rows = await db.select().from(settings);
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return (
    <>
      {await Promise.all(
        GROUPS.map(async (g) => {
          const raw = (stored[g.key] ?? {}) as Record<string, unknown>;
          // Stored values are shown as they are, so an invalid legacy value surfaces as a field error on save.
          const names = g.fields.flatMap((f) => (f.bilingual ? [f.name, `${f.name}En`] : [f.name]));
          const initial = Object.fromEntries(names.map((name) => [name, raw[name] ?? (name.endsWith("MediaId") ? null : "")]));
          const images = Object.fromEntries(
            await Promise.all(g.fields.filter((f) => f.kind === "image").map(async (f) => [f.name, await pickerMedia(db, initial[f.name] as number | null)] as const)),
          );
          return <SettingsForm key={g.key} group={g.key} title={g.title} description={g.description} fields={g.fields} initial={initial} images={images} />;
        }),
      )}
    </>
  );
}

function SettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      {GROUPS.map((g) => (
        <div key={g.key} className="space-y-4 rounded-lg border p-4 sm:p-6">
          <Skeleton className="h-5 w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            {g.fields.map((f) => (
              <div key={f.name} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AdminSettingsPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Settings & SEO" description="Changes appear on the public site straight after saving." />
      <Suspense fallback={<SettingsSkeleton />}>
        <div className="space-y-6">
          <SettingsForms />
        </div>
      </Suspense>
    </>
  );
}
