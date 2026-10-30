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
import { Field, describedBy } from "@/components/admin/form-bits";
import { LanguageTabs, LanguageTab } from "@/components/admin/language-tabs";
import { MediaField } from "@/components/admin/media-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LeaderGroup } from "@/db/schema";
import { leaderSchema, type LeaderFormValues } from "@/lib/validation/admin";
import { routes } from "@/lib/routes";
import type { PickerMedia } from "../media/actions";
import { deleteLeaderAction, saveLeaderAction } from "./actions";

interface LeaderFormProps {
  id: number | null;
  initial: LeaderFormValues;
  photo: PickerMedia | null;
  groups: Array<{ value: LeaderGroup; label: string }>;
}

export function LeaderForm({ id, initial, photo: initialPhoto, groups }: LeaderFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [photo, setPhoto] = useState(initialPhoto);
  const form = useForm<LeaderFormValues>({ resolver: zodResolver(leaderSchema), defaultValues: initial });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveLeaderAction(id, values);
      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) form.setError(field as keyof LeaderFormValues, { message });
        toast.error(result.error);
        return;
      }
      toast.success(id ? "Leader saved" : "Leader added");
      form.reset(form.getValues());
      if (!id) router.replace(`/admin/leaders/${result.id}/`);
      else router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <Panel title="Profile">
          <LanguageTabs>
            <LanguageTab value="ml">
              <div className="space-y-4">
                <Field id="name" label="Name" error={errors.name?.message}>
                  <Input id="name" className="h-10 text-base" aria-invalid={!!errors.name} aria-describedby={describedBy("name", errors.name?.message)} {...form.register("name")} />
                </Field>
                <Field id="roleTitle" label="Role" error={errors.roleTitle?.message} hint="For example: Secretary, Shoora member.">
                  <Input id="roleTitle" className="h-10" aria-describedby={describedBy("roleTitle", errors.roleTitle?.message, "x")} {...form.register("roleTitle")} />
                </Field>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Biography</span>
                  <Controller
                    control={form.control}
                    name="bioHtml"
                    render={({ field }) => <RichTextEditor value={field.value ?? ""} onChange={field.onChange} label="Biography" invalid={!!errors.bioHtml} />}
                  />
                  {errors.bioHtml ? <p className="text-sm text-destructive">{errors.bioHtml.message}</p> : null}
                </div>
              </div>
            </LanguageTab>
            <LanguageTab value="en">
              <div className="space-y-4">
                <Field id="nameEn" label="Name" error={errors.nameEn?.message}>
                  <Input id="nameEn" className="h-10 text-base" aria-invalid={!!errors.nameEn} aria-describedby={describedBy("nameEn", errors.nameEn?.message)} {...form.register("nameEn")} />
                </Field>
                <Field id="roleTitleEn" label="Role" error={errors.roleTitleEn?.message} hint="For example: Secretary, Shoora member.">
                  <Input id="roleTitleEn" className="h-10" aria-describedby={describedBy("roleTitleEn", errors.roleTitleEn?.message, "x")} {...form.register("roleTitleEn")} />
                </Field>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Biography</span>
                  <Controller
                    control={form.control}
                    name="bioHtmlEn"
                    render={({ field }) => <RichTextEditor value={field.value ?? ""} onChange={field.onChange} label="Biography" invalid={!!errors.bioHtmlEn} />}
                  />
                  {errors.bioHtmlEn ? <p className="text-sm text-destructive">{errors.bioHtmlEn.message}</p> : null}
                </div>
              </div>
            </LanguageTab>
          </LanguageTabs>
        </Panel>
        <Panel title="URL slug" description="Leave empty to create one from the name. Changing it changes the public URL.">
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
            <Field id="groupKey" label="Group" error={errors.groupKey?.message}>
              <Controller
                control={form.control}
                name="groupKey"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="groupKey" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field id="sortOrder" label="Order" error={errors.sortOrder?.message} hint="Lower numbers come first within the group.">
              <Input id="sortOrder" type="number" inputMode="numeric" min={0} className="h-10" aria-describedby={describedBy("sortOrder", errors.sortOrder?.message, "x")} {...form.register("sortOrder", { valueAsNumber: true })} />
            </Field>
            <SaveActions pending={pending} saved={!!id} dirty={isDirty} viewHref={id && initial.slug ? routes.leader(initial.slug) : null} />
          </div>
        </Panel>
        <Panel title="Photo">
          <Controller
            control={form.control}
            name="photoMediaId"
            render={({ field }) => (
              <MediaField
                label="Photo"
                value={field.value ?? null}
                preview={photo}
                onChange={(m) => {
                  setPhoto(m);
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
                <Trash2 className="size-4" aria-hidden="true" /> Remove leader
              </Button>
            }
            title="Remove this leader?"
            description="The profile is removed from the leaders page and its URL will return “not found”. The photo stays in the media library. This cannot be undone. To hide the profile instead, set the status to Draft."
            confirmLabel="Remove leader"
            action={() => deleteLeaderAction(id)}
            redirectTo="/admin/leaders/"
          />
        ) : null}
      </div>
    </form>
  );
}
