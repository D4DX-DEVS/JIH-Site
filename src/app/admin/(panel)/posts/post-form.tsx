"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/admin/admin-ui";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Field, describedBy, toLocalInput } from "@/components/admin/form-bits";
import { MediaField } from "@/components/admin/media-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { errors } = form.formState;

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
          <div className="space-y-4">
            <Field id="title" label="Title" error={errors.title?.message}>
              <Input id="title" className="h-11 text-base" aria-invalid={!!errors.title} aria-describedby={describedBy("title", errors.title?.message)} {...form.register("title")} />
            </Field>
            <Field id="slug" label="URL slug" error={errors.slug?.message} hint="Leave empty to create one from the title. Changing it changes the public URL.">
              <Input id="slug" className="h-11" aria-invalid={!!errors.slug} aria-describedby={describedBy("slug", errors.slug?.message, "x")} {...form.register("slug")} />
            </Field>
            <div className="space-y-2">
              <span className="text-sm font-medium" id="content-label">Body</span>
              <Controller
                control={form.control}
                name="contentHtml"
                render={({ field }) => <RichTextEditor value={field.value ?? ""} onChange={field.onChange} label="Post body" invalid={!!errors.contentHtml} />}
              />
              {errors.contentHtml ? <p className="text-sm text-destructive">{errors.contentHtml.message}</p> : null}
            </div>
            <Field id="excerpt" label="Excerpt" error={errors.excerpt?.message} hint="Shown in lists. Leave empty to use the start of the body.">
              <Textarea id="excerpt" rows={3} aria-describedby={describedBy("excerpt", errors.excerpt?.message, "x")} {...form.register("excerpt")} />
            </Field>
          </div>
        </Panel>
        <Panel title="Search engines" description="Leave empty to use the title and excerpt.">
          <div className="space-y-4">
            <Field id="seoTitle" label="SEO title" error={errors.seoTitle?.message}>
              <Input id="seoTitle" className="h-11" {...form.register("seoTitle")} />
            </Field>
            <Field id="seoDescription" label="Meta description" error={errors.seoDescription?.message}>
              <Textarea id="seoDescription" rows={3} {...form.register("seoDescription")} />
            </Field>
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Publish">
          <div className="space-y-4">
            <Field id="status" label="Status" error={errors.status?.message}>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field id="publishedAt" label="Publish date" error={errors.publishedAt?.message} hint="A future date schedules the post.">
              <Input id="publishedAt" type="datetime-local" className="h-11" {...form.register("publishedAt")} />
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
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="h-11 flex-1" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {pending ? "Saving…" : "Save"}
              </Button>
              {id && initial.slug ? (
                <Button asChild variant="outline" className="h-11">
                  <a href={routes.post(initial.slug)} target="_blank" rel="noopener">
                    <ExternalLink className="size-4" aria-hidden="true" /> View
                  </a>
                </Button>
              ) : null}
            </div>
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
              <Button type="button" variant="outline" className="h-11 w-full text-destructive">
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
