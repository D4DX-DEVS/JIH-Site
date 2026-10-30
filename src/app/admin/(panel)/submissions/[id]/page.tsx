import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft, Mail, Phone, Trash2 } from "lucide-react";
import { Panel, StatusBadge } from "@/components/admin/admin-ui";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { formSubmissions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { deleteSubmissionAction } from "../actions";
import { StatusControls } from "../status-controls";

export const metadata: Metadata = { title: "Message" };
export const instant = false;

export default async function SubmissionPage({ params }: PageProps<"/admin/submissions/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const db = await getDb();
  const [s] = await db.select().from(formSubmissions).where(eq(formSubmissions.id, id)).limit(1);
  if (!s) notFound();

  return (
    <>
      <div>
        <Link href="/admin/submissions/" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden="true" /> Submissions
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{s.subject || `Message from ${s.name}`}</h1>
          <StatusBadge status={s.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Received {formatDateTime(s.createdAt)} IST</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="Message">
          {/* Plain text only: visitor input is never rendered as HTML. */}
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{s.message}</p>
        </Panel>
        <div className="space-y-6">
          <Panel title="Sender">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{s.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>
                  <a href={`mailto:${s.email}`} className="inline-flex min-h-11 items-center gap-2 break-all underline-offset-4 hover:underline">
                    <Mail className="size-4 shrink-0" aria-hidden="true" /> {s.email}
                  </a>
                </dd>
              </div>
              {s.phone ? (
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>
                    <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline">
                      <Phone className="size-4 shrink-0" aria-hidden="true" /> {s.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </Panel>
          <Panel title="Actions">
            <div className="space-y-3">
              <StatusControls id={s.id} status={s.status} />
              <ConfirmAction
                trigger={
                  <Button type="button" variant="outline" className="h-11 w-full text-destructive sm:h-9">
                    <Trash2 className="size-4" aria-hidden="true" /> Delete message
                  </Button>
                }
                title="Delete this message?"
                description="The message and the sender’s details are removed permanently. Archive it instead if you may need it later."
                confirmLabel="Delete message"
                action={deleteSubmissionAction.bind(null, s.id)}
                redirectTo="/admin/submissions/"
              />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
