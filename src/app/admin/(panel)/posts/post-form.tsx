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
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { PickerMedia } from "../media/actions";
import { postSchema, type PostFormValues } from "@/lib/validation/admin";
import { routes } from "@/lib/routes";
import { deletePostAction, savePostAction } from "./actions";

interface PostFormProps {
  id: number | null;
  initial: PostFormValues;
  featured: PickerMedia | null;
  categories: Array<{ id: number; name: string; parentId: number | null }>;
}

export function PostForm({ id, initial, featured: initialFeatured, categories }: PostFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [featured, setFeatured] = useState(initialFeatured);
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { ...initial, publishedAt: toLocalInput(initial.publishedAt) },
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await savePostAction(id, { ...values, publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : "" });
      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) form.setError(field as keyof PostFormValues, { message });
        toast.error(result.error);
        return;
      }
      toast.success(id ? "Post saved" : "Post created");
      form.reset(form.getValues());
      if (!id) router.replace(`/admin/posts/${result.id}/`);
      else router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <Panel title="Content">
          <LanguageTabs>
            <LanguageTab value="ml">
              <div className="space-y-4">
                <Field id="title" label="Title" error={errors.title?.message}>
                  <Input id="title" className="h-10 text-base" aria-invalid={!!errors.title} aria-describedby={describedBy("title", errors.title?.message)} {...form.register("title")} />
                </Field>
                <Field id="excerpt" label="Excerpt" error={errors.excerpt?.message} hint="Shown in lists. Leave empty to use the start of the body.">
                  <Textarea id="excerpt" rows={3} aria-describedby={describedBy("excerpt", errors.excerpt?.message, "x")} {...form.register("excerpt")} />
                </Field>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Body</span>
                  <Controller
                    control={form.control}
                    name="contentHtml"
                    render={({ field }) => <RichTextEditor value={field.value ?? ""} onChange={field.onChange} label="Post body" invalid={!!errors.contentHtml} />}
                  />
                  {errors.contentHtml ? <p className="text-sm text-destructive">{errors.contentHtml.message}</p> : null}
                </div>
              </div>
            </LanguageTab>
            <LanguageTab value="en">
              <div className="space-y-4">
                <Field id="titleEn" label="Title" error={errors.titleEn?.message}>
                  <Input id="titleEn" className="h-10 text-base" aria-invalid={!!errors.titleEn} aria-describedby={describedBy("titleEn", errors.titleEn?.message)} {...form.register("titleEn")} />
                </Field>
                <Field id="excerptEn" label="Excerpt" error={errors.excerptEn?.message} hint="Shown in lists. Leave empty to use the start of the body.">
                  <Textarea id="excerptEn" rows={3} aria-describedby={describedBy("excerptEn", errors.excerptEn?.message, "x")} {...form.register("excerptEn")} />
                </Field>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Body</span>
                  <Controller
                    control={form.control}
                    name="contentHtmlEn"
                    render={({ field }) => <RichTextEditor value={field.value ?? ""} onChange={field.onChange} label="Post body" invalid={!!errors.contentHtmlEn} />}
                  />
                  {errors.contentHtmlEn ? <p className="text-sm text-destructive">{errors.contentHtmlEn.message}</p> : null}
                </div>
              </div>
            </LanguageTab>
          </LanguageTabs>
        </Panel>
        <Panel title="URL slug" description="Leave empty to create one from the title. Changing it changes the public URL.">
          <Field id="slug" label="Slug" error={errors.slug?.message}>
            <Input id="slug" className="h-10" aria-invalid={!!errors.slug} aria-describedby={describedBy("slug", errors.slug?.message)} {...form.register("slug")} />
          </Field>
        </Panel>
        <Panel title="Search engines" description="Leave empty to use the title and excerpt.">
          <LanguageTabs>
            <LanguageTab value="ml">
              <div className="space-y-4">
                <Field id="seoTitle" label="SEO title" error={errors.seoTitle?.message}>
                  <Input id="seoTitle" className="h-10" {...form.register("seoTitle")} />
                </Field>
                <Field id="seoDescription" label="Meta description" error={errors.seoDescription?.message}>
                  <Textarea id="seoDescription" rows={3} {...form.register("seoDescription")} />
                </Field>
              </div>
            </LanguageTab>
            <LanguageTab value="en">
              <div className="space-y-4">
                <Field id="seoTitleEn" label="SEO title" error={errors.seoTitleEn?.message}>
                  <Input id="seoTitleEn" className="h-10" {...form.register("seoTitleEn")} />
                </Field>
                <Field id="seoDescriptionEn" label="Meta description" error={errors.seoDescriptionEn?.message}>
                  <Textarea id="seoDescriptionEn" rows={3} {...form.register("seoDescriptionEn")} />
                </Field>
              </div>
            </LanguageTab>
          </LanguageTabs>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Publish">
          <div className="space-y-4">
            <Field id="status" label="Status" error={errors.status?.message}>
              <Controller control={form.control} name="status" render={({ field }) => <StatusToggle id="status" value={field.value} onChange={field.onChange} />} />
            </Field>
            <Field id="publishedAt" label="Publish date" error={errors.publishedAt?.message} hint="A future date schedules the post.">
              <Input id="publishedAt" type="datetime-local" className="h-10" {...form.register("publishedAt")} />
            </Field>
            <Controller
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium">
                  Feature on homepage
                  <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
            <SaveActions pending={pending} saved={!!id} dirty={isDirty} viewHref={id && initial.slug ? routes.post(initial.slug) : null} />
          </div>
        </Panel>
        <Panel title="Featured image">
          <Controller
            control={form.control}
            name="featuredMediaId"
            render={({ field }) => (
              <MediaField
                label="Image"
                value={field.value ?? null}
                preview={featured}
                onChange={(m) => {
                  setFeatured(m);
                  field.onChange(m?.id ?? null);
                }}
              />
            )}
          />
        </Panel>
        <Panel title="Categories">
          <Controller
            control={form.control}
            name="categoryIds"
            render={({ field }) => (
              <fieldset className="space-y-1">
                <legend className="sr-only">Categories</legend>
                {categories.map((c) => {
                  const checked = (field.value ?? []).includes(c.id);
                  return (
                    <label key={c.id} className={`flex min-h-10 items-center gap-3 text-sm ${c.parentId ? "pl-6" : ""}`}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => field.onChange(v ? [...(field.value ?? []), c.id] : (field.value ?? []).filter((x) => x !== c.id))}
                      />
                      {c.name}
                    </label>
                  );
                })}
              </fieldset>
            )}
          />
        </Panel>
        {id ? (
          <ConfirmAction
            trigger={
              <Button type="button" variant="outline" className="h-10 w-full border-destructive/25 text-destructive hover:bg-destructive/5 hover:text-destructive">
                <Trash2 className="size-4" aria-hidden="true" /> Delete post
              </Button>
            }
            title="Delete this post?"
            description="The post is removed from the website and its URL will return “not found”. This cannot be undone. To hide it instead, set the status to Draft."
            confirmLabel="Delete post"
            action={() => deletePostAction(id)}
            redirectTo="/admin/posts/"
          />
        ) : null}
      </div>
    </form>
  );
}
