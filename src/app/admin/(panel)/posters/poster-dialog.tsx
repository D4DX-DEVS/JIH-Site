"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { FormDialog, applyFormResult } from "@/components/admin/form-dialog";
import { Field, describedBy } from "@/components/admin/form-bits";
import { LanguageTabs, LanguageTab } from "@/components/admin/language-tabs";
import { MediaField } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { posterSchema, type PosterFormValues } from "@/lib/validation/admin";
import type { PickerMedia } from "../media/actions";
import { savePosterAction } from "./actions";

interface PosterDialogProps {
  trigger: ReactNode;
  poster?: { id: number; image: PickerMedia | null } & PosterFormValues;
  nextSortOrder?: number;
}

export function PosterDialog({ trigger, poster, nextSortOrder = 0 }: PosterDialogProps) {
  return (
    <FormDialog trigger={trigger} title={poster ? "Edit poster" : "Add poster"} description="Posters appear in the strip on the homepage, in sort order.">
      {(close) => <PosterForm poster={poster} nextSortOrder={nextSortOrder} onDone={close} />}
    </FormDialog>
  );
}

function PosterForm({ poster, nextSortOrder, onDone }: { poster?: PosterDialogProps["poster"]; nextSortOrder: number; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [image, setImage] = useState(poster?.image ?? null);
  const form = useForm<PosterFormValues>({
    resolver: zodResolver(posterSchema),
    defaultValues: {
      mediaId: poster?.mediaId,
      title: poster?.title ?? "",
      titleEn: poster?.titleEn ?? "",
      linkUrl: poster?.linkUrl ?? "",
      sortOrder: poster?.sortOrder ?? nextSortOrder,
      active: poster?.active ?? true,
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      if (applyFormResult(form, await savePosterAction(poster?.id ?? null, values), "Saved")) {
        onDone();
        router.refresh();
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-2">
        <span className="text-sm font-medium">Poster image</span>
        <Controller
          control={form.control}
          name="mediaId"
          render={({ field }) => (
            <MediaField
              label="Image"
              value={field.value ?? null}
              preview={image}
              onChange={(m) => {
                setImage(m);
                field.onChange(m?.id);
              }}
            />
          )}
        />
        {errors.mediaId ? <p className="text-sm text-destructive">{errors.mediaId.message}</p> : null}
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">Title</span>
        <span className="text-xs text-muted-foreground">Used as the image’s accessible name. Describe what the poster says.</span>
        <LanguageTabs>
          <LanguageTab value="ml">
            <Field id="poster-title" label="Malayalam" error={errors.title?.message}>
              <Input id="poster-title" className="h-9" aria-describedby={describedBy("poster-title", errors.title?.message, "x")} {...form.register("title")} />
            </Field>
          </LanguageTab>
          <LanguageTab value="en">
            <Field id="poster-titleEn" label="English" error={errors.titleEn?.message}>
              <Input id="poster-titleEn" className="h-9" aria-describedby={describedBy("poster-titleEn", errors.titleEn?.message, "x")} {...form.register("titleEn")} />
            </Field>
          </LanguageTab>
        </LanguageTabs>
      </div>
      <Field id="poster-link" label="Link (optional)" error={errors.linkUrl?.message} hint="A path like /news/ or a full https:// address.">
        <Input id="poster-link" className="h-9" inputMode="url" aria-invalid={!!errors.linkUrl} aria-describedby={describedBy("poster-link", errors.linkUrl?.message, "x")} {...form.register("linkUrl")} />
      </Field>
      <Field id="poster-sort" label="Sort order" error={errors.sortOrder?.message} hint="Lower numbers come first.">
        <Input id="poster-sort" type="number" min={0} className="h-11 w-32" aria-describedby={describedBy("poster-sort", errors.sortOrder?.message, "x")} {...form.register("sortOrder", { valueAsNumber: true })} />
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
        <Button type="button" variant="outline" className="h-9 sm:h-8" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" className="h-9 sm:h-8" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
