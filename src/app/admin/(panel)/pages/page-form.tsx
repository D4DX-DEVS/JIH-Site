"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/admin/admin-ui";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Field, describedBy } from "@/components/admin/form-bits";
import { MediaField } from "@/components/admin/media-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PAGE_SECTIONS, PAGE_TEMPLATES } from "@/db/schema";
import { pageSchema, type PageFormValues } from "@/lib/validation/admin";
import { routes } from "@/lib/routes";
import type { PickerMedia } from "../media/actions";
import { deletePageAction, savePageAction } from "./actions";
import { SECTION_LABELS, TEMPLATE_LABELS } from "./labels";

interface PageFormProps {
  id: number | null;
  initial: PageFormValues;
  featured: PickerMedia | null;
}

export function PageForm({ id, initial, featured: initialFeatured }: PageFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [featured, setFeatured] = useState(initialFeatured);
  const form = useForm<PageFormValues>({ resolver: zodResolver(pageSchema), defaultValues: initial });
  const { errors } = form.formState;
  const template = useWatch({ control: form.control, name: "template" });

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await savePageAction(id, values);
      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) form.setError(field as keyof PageFormValues, { message });
        toast.error(result.error);
        return;
      }
      toast.success(id ? "Page saved" : "Page created");
      form.reset(form.getValues());
      if (!id) router.replace(`/admin/pages/${result.id}/`);
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
            <Field id="summary" label="Summary" error={errors.summary?.message} hint="Shown on section hub cards and in search results.">
              <Textarea id="summary" rows={3} aria-describedby={describedBy("summary", errors.summary?.message, "x")} {...form.register("summary")} />
            </Field>
            <div className="space-y-2">
              <span className="text-sm font-medium">Body</span>
              <Controller
                control={form.control}
                name="contentHtml"
                render={({ field }) => <RichTextEditor value={field.value ?? ""} onChange={field.onChange} label="Page body" invalid={!!errors.contentHtml} />}
              />
              {errors.contentHtml ? <p className="text-sm text-destructive">{errors.contentHtml.message}</p> : null}
            </div>
          </div>
        </Panel>
        <Panel title="Search engines" description="Leave empty to use the title and summary.">
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
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="h-11 flex-1" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {pending ? "Saving…" : "Save"}
              </Button>
              {id && initial.slug ? (
                <Button asChild variant="outline" className="h-11">
                  <a href={routes.page(initial.slug)} target="_blank" rel="noopener">
                    <ExternalLink className="size-4" aria-hidden="true" /> View
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </Panel>
        <Panel title="Placement">
          <div className="space-y-4">
            <Field id="section" label="Section" error={errors.section?.message} hint="The hub card list this page appears in.">
              <Controller
                control={form.control}
                name="section"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="section" className="h-11 w-full" aria-describedby={describedBy("section", errors.section?.message, "x")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SECTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SECTION_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field id="template" label="Template" error={errors.template?.message} hint="Only change this for pages that drive a section of the site.">
              <Controller
                control={form.control}
                name="template"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="template" className="h-11 w-full" aria-describedby={describedBy("template", errors.template?.message, "x")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_TEMPLATES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TEMPLATE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            {template === "hub" ? (
              <Field id="hubSection" label="Hub lists pages from" error={errors.hubSection?.message}>
                <Controller
                  control={form.control}
                  name="hubSection"
                  render={({ field }) => (
                    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                      <SelectTrigger id="hubSection" className="h-11 w-full">
                        <SelectValue placeholder="Choose a section" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SECTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {SECTION_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            ) : null}
            <Field id="sortOrder" label="Order" error={errors.sortOrder?.message} hint="Lower numbers come first within the section.">
              <Input id="sortOrder" type="number" inputMode="numeric" min={0} className="h-11" aria-describedby={describedBy("sortOrder", errors.sortOrder?.message, "x")} {...form.register("sortOrder", { valueAsNumber: true })} />
            </Field>
            <Field id="externalUrl" label="External website" error={errors.externalUrl?.message} hint="Optional. Shown as a link on the page, for organisations with their own site.">
              <Input id="externalUrl" type="url" inputMode="url" placeholder="https://" className="h-11" aria-invalid={!!errors.externalUrl} aria-describedby={describedBy("externalUrl", errors.externalUrl?.message, "x")} {...form.register("externalUrl")} />
            </Field>
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
        {id && initial.template === "default" ? (
          <ConfirmAction
            trigger={
              <Button type="button" variant="outline" className="h-11 w-full text-destructive">
                <Trash2 className="size-4" aria-hidden="true" /> Delete page
              </Button>
            }
            title="Delete this page?"
            description="The page is removed from the website and its URL will return “not found”. This cannot be undone. To hide it instead, set the status to Draft."
            confirmLabel="Delete page"
            action={() => deletePageAction(id)}
            redirectTo="/admin/pages/"
          />
        ) : id ? (
          <p className="text-sm text-muted-foreground">This page drives a section of the site, so it cannot be deleted. Set it to Draft to hide it.</p>
        ) : null}
      </div>
    </form>
  );
}
