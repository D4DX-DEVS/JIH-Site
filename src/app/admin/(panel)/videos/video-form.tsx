"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CirclePlay, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/admin/admin-ui";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { SaveActions, StatusToggle } from "@/components/admin/publish-controls";
import { Field, describedBy, toLocalInput } from "@/components/admin/form-bits";
import { LanguageTabs, LanguageTab } from "@/components/admin/language-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseYoutubeId, videoSchema, type VideoFormValues } from "@/lib/validation/admin";
import { routes, youtubeThumb } from "@/lib/routes";
import { deleteVideoAction, saveVideoAction } from "./actions";

interface VideoFormProps {
  id: number | null;
  initial: VideoFormValues;
}

export function VideoForm({ id, initial }: VideoFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: { ...initial, publishedAt: toLocalInput(initial.publishedAt) },
  });
  const { errors, isDirty } = form.formState;
  const youtubeId = parseYoutubeId(useWatch({ control: form.control, name: "youtube" }) ?? "");

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveVideoAction(id, { ...values, publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : "" });
      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) form.setError(field as keyof VideoFormValues, { message });
        toast.error(result.error);
        return;
      }
      toast.success(id ? "Video saved" : "Video added");
      form.reset(form.getValues());
      if (!id) router.replace(`/admin/videos/${result.id}/`);
      else router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <Panel title="Video">
          <Field id="youtube" label="YouTube link" error={errors.youtube?.message} hint="Paste the video address, a youtu.be link or the 11-character id.">
            <Input
              id="youtube"
              type="url"
              inputMode="url"
              placeholder="https://www.youtube.com/watch?v="
              className="h-10"
              aria-invalid={!!errors.youtube}
              aria-describedby={describedBy("youtube", errors.youtube?.message, "x")}
              {...form.register("youtube")}
            />
          </Field>
          <div className="overflow-hidden rounded-lg border bg-muted">
            {youtubeId ? (
              // eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail preview; next/image is unoptimized here
              <img src={youtubeThumb(youtubeId)} alt="Thumbnail of the linked video" className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <CirclePlay className="size-5" aria-hidden="true" />
                The thumbnail appears here once the link is recognised.
              </div>
            )}
          </div>
        </Panel>
        <Panel title="Details">
          <LanguageTabs>
            <LanguageTab value="ml">
              <div className="space-y-4">
                <Field id="title" label="Title" error={errors.title?.message}>
                  <Input id="title" className="h-10 text-base" aria-invalid={!!errors.title} aria-describedby={describedBy("title", errors.title?.message)} {...form.register("title")} />
                </Field>
                <Field id="description" label="Description" error={errors.description?.message}>
                  <Textarea id="description" rows={4} {...form.register("description")} />
                </Field>
              </div>
            </LanguageTab>
            <LanguageTab value="en">
              <div className="space-y-4">
                <Field id="titleEn" label="Title" error={errors.titleEn?.message}>
                  <Input id="titleEn" className="h-10 text-base" aria-invalid={!!errors.titleEn} aria-describedby={describedBy("titleEn", errors.titleEn?.message)} {...form.register("titleEn")} />
                </Field>
                <Field id="descriptionEn" label="Description" error={errors.descriptionEn?.message}>
                  <Textarea id="descriptionEn" rows={4} {...form.register("descriptionEn")} />
                </Field>
              </div>
            </LanguageTab>
          </LanguageTabs>
        </Panel>
        <Panel title="URL slug" description="Leave empty to create one from the title. Changing it changes the public URL.">
          <Field id="slug" label="Slug" error={errors.slug?.message}>
            <Input id="slug" className="h-10" aria-invalid={!!errors.slug} aria-describedby={describedBy("slug", errors.slug?.message)} {...form.register("slug")} />
          </Field>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Publish">
          <div className="space-y-4">
            <Field id="status" label="Status" error={errors.status?.message}>
              <Controller control={form.control} name="status" render={({ field }) => <StatusToggle id="status" value={field.value} onChange={field.onChange} />} />
            </Field>
            <Field id="publishedAt" label="Publish date" error={errors.publishedAt?.message} hint="Videos are listed newest first.">
              <Input id="publishedAt" type="datetime-local" className="h-10" aria-describedby={describedBy("publishedAt", errors.publishedAt?.message, "x")} {...form.register("publishedAt")} />
            </Field>
            <SaveActions pending={pending} saved={!!id} dirty={isDirty} viewHref={id && initial.slug ? routes.video(initial.slug) : null} />
          </div>
        </Panel>
        {id ? (
          <ConfirmAction
            trigger={
              <Button type="button" variant="outline" className="h-10 w-full border-destructive/25 text-destructive hover:bg-destructive/5 hover:text-destructive">
                <Trash2 className="size-4" aria-hidden="true" /> Delete video
              </Button>
            }
            title="Delete this video?"
            description="The video is removed from the video gallery and its URL will return “not found”. The video itself stays on YouTube. This cannot be undone. To hide it instead, set the status to Draft."
            confirmLabel="Delete video"
            action={() => deleteVideoAction(id)}
            redirectTo="/admin/videos/"
          />
        ) : null}
      </div>
    </form>
  );
}
