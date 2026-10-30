"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/admin/admin-ui";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { SaveActions, StatusToggle } from "@/components/admin/publish-controls";
import { Field, describedBy, toLocalInput } from "@/components/admin/form-bits";
import { LanguageTabs, LanguageTab } from "@/components/admin/language-tabs";
import { MediaField } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { gallerySchema, type GalleryFormValues } from "@/lib/validation/admin";
import { routes } from "@/lib/routes";
import type { PickerMedia } from "../media/actions";
import { deleteGalleryAction, saveGalleryAction } from "./actions";
import { GalleryImages } from "./gallery-images";

const NO_CATEGORY = "none";

interface GalleryFormProps {
  id: number | null;
  initial: GalleryFormValues;
  cover: PickerMedia | null;
  images: PickerMedia[];
  categories: Array<{ id: number; name: string }>;
}

export function GalleryForm({ id, initial, cover: initialCover, images: initialImages, categories }: GalleryFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cover, setCover] = useState(initialCover);
  const [images, setImages] = useState(initialImages);
  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(gallerySchema),
    defaultValues: { ...initial, titleEn: initial.titleEn ?? "", descriptionEn: initial.descriptionEn ?? "", publishedAt: toLocalInput(initial.publishedAt) },
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveGalleryAction(id, { ...values, publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : "" });
      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) form.setError(field as keyof GalleryFormValues, { message });
        toast.error(result.error);
        return;
      }
      toast.success(id ? "Gallery saved" : "Gallery created");
      form.reset(form.getValues());
      if (!id) router.replace(`/admin/galleries/${result.id}/`);
      else router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-6">
        <Panel title="Details">
          <LanguageTabs>
            <LanguageTab value="ml">
              <div className="space-y-4">
                <Field id="title" label="Title" error={errors.title?.message}>
                  <Input id="title" className="h-10 text-base" aria-invalid={!!errors.title} aria-describedby={describedBy("title", errors.title?.message)} {...form.register("title")} />
                </Field>
                <Field id="description" label="Description" error={errors.description?.message}>
                  <Textarea id="description" rows={3} {...form.register("description")} />
                </Field>
              </div>
            </LanguageTab>
            <LanguageTab value="en">
              <div className="space-y-4">
                <Field id="titleEn" label="Title" error={errors.titleEn?.message}>
                  <Input id="titleEn" className="h-10 text-base" aria-invalid={!!errors.titleEn} aria-describedby={describedBy("titleEn", errors.titleEn?.message)} {...form.register("titleEn")} />
                </Field>
                <Field id="descriptionEn" label="Description" error={errors.descriptionEn?.message}>
                  <Textarea id="descriptionEn" rows={3} {...form.register("descriptionEn")} />
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
        <Panel title="Images" description="Shown in this order on the gallery page.">
          <Controller
            control={form.control}
            name="imageIds"
            render={({ field }) => (
              <GalleryImages
                images={images}
                error={errors.imageIds?.message}
                onChange={(next) => {
                  setImages(next);
                  field.onChange(next.map((m) => m.id));
                }}
              />
            )}
          />
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Publish">
          <div className="space-y-4">
            <Field id="status" label="Status" error={errors.status?.message}>
              <Controller control={form.control} name="status" render={({ field }) => <StatusToggle id="status" value={field.value} onChange={field.onChange} />} />
            </Field>
            <Field id="publishedAt" label="Publish date" error={errors.publishedAt?.message} hint="Galleries are listed newest first.">
              <Input id="publishedAt" type="datetime-local" className="h-10" aria-describedby={describedBy("publishedAt", errors.publishedAt?.message, "x")} {...form.register("publishedAt")} />
            </Field>
            <Field id="categoryId" label="Category" error={errors.categoryId?.message}>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value ? String(field.value) : NO_CATEGORY} onValueChange={(v) => field.onChange(v === NO_CATEGORY ? null : Number(v))}>
                    <SelectTrigger id="categoryId" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <SaveActions pending={pending} saved={!!id} dirty={isDirty} viewHref={id && initial.slug ? routes.gallery(initial.slug) : null} />
          </div>
        </Panel>
        <Panel title="Cover image" description="Leave empty to use the first image.">
          <Controller
            control={form.control}
            name="coverMediaId"
            render={({ field }) => (
              <MediaField
                label="Cover"
                value={field.value ?? null}
                preview={cover}
                onChange={(m) => {
                  setCover(m);
                  field.onChange(m?.id ?? null);
                }}
              />
            )}
          />
        </Panel>
        {id ? (
          <ConfirmAction
            trigger={
              <Button type="button" variant="outline" className="h-10 w-full border-destructive/25 text-destructive hover:bg-destructive/5 hover:text-destructive">
                <Trash2 className="size-4" aria-hidden="true" /> Delete gallery
              </Button>
            }
            title="Delete this gallery?"
            description="The gallery is removed from the website and its URL will return “not found”. Its images stay in the media library. This cannot be undone. To hide it instead, set the status to Draft."
            confirmLabel="Delete gallery"
            action={() => deleteGalleryAction(id)}
            redirectTo="/admin/galleries/"
          />
        ) : null}
      </div>
    </form>
  );
}
