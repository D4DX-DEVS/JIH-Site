import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { getDb } from "@/db/client";
import { pages } from "@/db/schema";
import { pickerMedia } from "@/lib/admin/lookups";
import { requireAdmin } from "@/lib/auth/session";
import { PageForm } from "../page-form";

export const metadata: Metadata = { title: "Edit page" };
export const instant = false;

export default async function EditPagePage({ params }: PageProps<"/admin/pages/[id]">) {
  await requireAdmin();
  const { id: raw } = await params;
  const db = await getDb();
  const isNew = raw === "new";
  const id = isNew ? null : Number(raw);
  if (!isNew && !(id && Number.isInteger(id))) notFound();

  const [page] = id ? await db.select().from(pages).where(eq(pages.id, id)).limit(1) : [null];
  if (id && !page) notFound();
  const featured = await pickerMedia(db, page?.featuredMediaId);

  return (
    <>
      <div>
        <Link href="/admin/pages/" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden="true" /> Pages
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{page ? "Edit page" : "New page"}</h1>
      </div>
      <PageForm
        id={id}
        featured={featured}
        initial={{
          title: page?.title ?? "",
          titleEn: page?.titleEn ?? "",
          slug: page?.slug ?? "",
          status: page?.status ?? "draft",
          summary: page?.summary ?? "",
          summaryEn: page?.summaryEn ?? "",
          contentHtml: page?.contentHtml ?? "",
          contentHtmlEn: page?.contentHtmlEn ?? "",
          featuredMediaId: page?.featuredMediaId ?? null,
          template: page?.template ?? "default",
          section: page?.section ?? "general",
          hubSection: page?.hubSection ?? null,
          externalUrl: page?.externalUrl ?? "",
          sortOrder: page?.sortOrder ?? 0,
          seoTitle: page?.seoTitle ?? "",
          seoDescription: page?.seoDescription ?? "",
          seoTitleEn: page?.seoTitleEn ?? "",
          seoDescriptionEn: page?.seoDescriptionEn ?? "",
        }}
      />
    </>
  );
}
