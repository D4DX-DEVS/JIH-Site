"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { FormDialog, applyFormResult } from "@/components/admin/form-dialog";
import { Field, describedBy } from "@/components/admin/form-bits";
import { MediaField } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { downloadSchema, type DownloadFormValues } from "@/lib/validation/admin";
import type { PickerMedia } from "../media/actions";
import { saveDownloadAction } from "./actions";

interface DownloadDialogProps {
  trigger: ReactNode;
  download?: { id: number; file: PickerMedia | null } & DownloadFormValues;
  nextSortOrder?: number;
}

export function DownloadDialog({ trigger, download, nextSortOrder = 0 }: DownloadDialogProps) {
  return (
    <FormDialog trigger={trigger} title={download ? "Edit download" : "Add download"} description="Files listed on the public Downloads page.">
      {(close) => <DownloadForm download={download} nextSortOrder={nextSortOrder} onDone={close} />}
    </FormDialog>
  );
}

function DownloadForm({ download, nextSortOrder, onDone }: { download?: DownloadDialogProps["download"]; nextSortOrder: number; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState(download?.file ?? null);
  const form = useForm<DownloadFormValues>({
    resolver: zodResolver(downloadSchema),
    defaultValues: {
      title: download?.title ?? "",
      description: download?.description ?? "",
      mediaId: download?.mediaId,
      sortOrder: download?.sortOrder ?? nextSortOrder,
      active: download?.active ?? true,
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      if (applyFormResult(form, await saveDownloadAction(download?.id ?? null, values), "Saved")) {
        onDone();
        router.refresh();
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="download-title" label="Title" error={errors.title?.message}>
        <Input id="download-title" className="h-11" aria-invalid={!!errors.title} aria-describedby={describedBy("download-title", errors.title?.message)} {...form.register("title")} />
      </Field>
      <Field id="download-description" label="Description" error={errors.description?.message}>
        <Textarea id="download-description" rows={2} {...form.register("description")} />
      </Field>
      <div className="space-y-2">
        <span className="text-sm font-medium">File</span>
        <Controller
          control={form.control}
          name="mediaId"
          render={({ field }) => (
            <MediaField
              label="File"
              kind="document"
              value={field.value ?? null}
              preview={file}
              onChange={(m) => {
                setFile(m);
                field.onChange(m?.id);
              }}
            />
          )}
        />
        {errors.mediaId ? <p className="text-sm text-destructive">{errors.mediaId.message}</p> : null}
      </div>
      <Field id="download-sort" label="Sort order" error={errors.sortOrder?.message} hint="Lower numbers come first.">
        <Input id="download-sort" type="number" min={0} className="h-11 w-32" aria-describedby={describedBy("download-sort", errors.sortOrder?.message, "x")} {...form.register("sortOrder", { valueAsNumber: true })} />
      </Field>
      <Controller
        control={form.control}
        name="active"
        render={({ field }) => (
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium">
            Show on the website
            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
          </label>
        )}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" className="h-11 sm:h-9" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
