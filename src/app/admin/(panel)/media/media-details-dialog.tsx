"use client";
/* eslint-disable @next/next/no-img-element -- admin thumbnails from R2 with stored variants; next/image is unoptimized here */

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, ExternalLink, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FormDialog, applyFormResult } from "@/components/admin/form-dialog";
import { Field, describedBy } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mediaUrl, pickVariant } from "@/lib/media-url";
import { mediaMetaSchema, type MediaMetaValues } from "@/lib/validation/admin";
import type { MediaVariant } from "@/db/schema";
import { updateMediaMetaAction } from "./actions";

export interface MediaDetails {
  id: number;
  r2Key: string;
  filename: string;
  kind: "image" | "document" | "other";
  width: number | null;
  height: number | null;
  sizeLabel: string;
  variants: MediaVariant[];
  title: string;
  altText: string;
  caption: string;
}

export function MediaDetailsDialog({ item, trigger }: { item: MediaDetails; trigger: ReactNode }) {
  return (
    <FormDialog trigger={trigger} title="Media details" description={item.filename}>
      {(close) => <MediaDetailsForm item={item} onDone={close} />}
    </FormDialog>
  );
}

function MediaDetailsForm({ item, onDone }: { item: MediaDetails; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<MediaMetaValues>({
    resolver: zodResolver(mediaMetaSchema),
    defaultValues: { title: item.title, altText: item.altText, caption: item.caption },
  });
  const { errors } = form.formState;
  const url = mediaUrl(item.r2Key);

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      if (applyFormResult(form, await updateMediaMetaAction(item.id, values), "Saved")) {
        onDone();
        router.refresh();
      }
    }),
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(url, window.location.origin).toString());
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it instead.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {item.kind === "image" ? (
          <img src={pickVariant(item, 480)} alt="" className="size-28 shrink-0 rounded-md border object-contain" />
        ) : (
          <span className="flex size-28 shrink-0 items-center justify-center rounded-md border bg-muted">
            <FileText className="size-8" aria-hidden="true" />
          </span>
        )}
        <dl className="min-w-0 space-y-1 text-sm">
          <div>
            <dt className="sr-only">Size</dt>
            <dd>{item.sizeLabel}{item.width && item.height ? ` · ${item.width}×${item.height}` : ""}</dd>
          </div>
          <div>
            <dt className="sr-only">Address</dt>
            <dd className="break-all text-xs text-muted-foreground">{url}</dd>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="h-11 sm:h-8" onClick={copy}>
              <Copy className="size-4" aria-hidden="true" /> Copy link
            </Button>
            <Button asChild variant="outline" size="sm" className="h-11 sm:h-8">
              <a href={url} target="_blank" rel="noopener">
                <ExternalLink className="size-4" aria-hidden="true" /> Open
              </a>
            </Button>
          </div>
        </dl>
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field id="media-title" label="Title" error={errors.title?.message}>
          <Input id="media-title" className="h-9" {...form.register("title")} />
        </Field>
        {item.kind === "image" ? (
          <Field id="media-alt" label="Alternative text" error={errors.altText?.message} hint="Describe the picture for people who cannot see it. Leave empty only for decoration.">
            <Textarea id="media-alt" rows={2} aria-describedby={describedBy("media-alt", errors.altText?.message, "x")} {...form.register("altText")} />
          </Field>
        ) : null}
        <Field id="media-caption" label="Caption" error={errors.caption?.message}>
          <Textarea id="media-caption" rows={2} {...form.register("caption")} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="h-9 sm:h-8" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" className="h-9 sm:h-8" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
