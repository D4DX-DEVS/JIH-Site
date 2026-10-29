import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { getDb } from "@/db/client";
import { LEADER_GROUPS, leaders } from "@/db/schema";
import { LEADER_GROUP_TITLES } from "@/app/(site)/_components/templates/leaders-page";
import { pickerMedia } from "@/lib/admin/lookups";
import { requireAdmin } from "@/lib/auth/session";
import { LeaderForm } from "../leader-form";

export const metadata: Metadata = { title: "Edit leader" };
export const instant = false;

export default async function EditLeaderPage({ params }: PageProps<"/admin/leaders/[id]">) {
  await requireAdmin();
  const { id: raw } = await params;
  const db = await getDb();
  const isNew = raw === "new";
  const id = isNew ? null : Number(raw);
  if (!isNew && !(id && Number.isInteger(id))) notFound();

  const [leader] = id ? await db.select().from(leaders).where(eq(leaders.id, id)).limit(1) : [null];
  if (id && !leader) notFound();
  const photo = await pickerMedia(db, leader?.photoMediaId);

  return (
    <>
      <div>
        <Link href="/admin/leaders/" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden="true" /> Leaders
        </Link>
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{leader ? "Edit leader" : "Add leader"}</h1>
      </div>
      <LeaderForm
        id={id}
        photo={photo}
        groups={LEADER_GROUPS.map((g) => ({ value: g, label: LEADER_GROUP_TITLES[g] }))}
        initial={{
          name: leader?.name ?? "",
          slug: leader?.slug ?? "",
          roleTitle: leader?.roleTitle ?? "",
          groupKey: leader?.groupKey ?? "shoora",
          bioHtml: leader?.bioHtml ?? "",
          photoMediaId: leader?.photoMediaId ?? null,
          sortOrder: leader?.sortOrder ?? 0,
          status: leader?.status ?? "published",
        }}
      />
    </>
  );
}
