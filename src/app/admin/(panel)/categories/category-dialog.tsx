"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { FormDialog, applyFormResult } from "@/components/admin/form-dialog";
import { Field, describedBy } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { categorySchema, type CategoryFormValues } from "@/lib/validation/admin";
import { saveCategoryAction } from "./actions";

const NONE = "none";

interface CategoryDialogProps {
  trigger: ReactNode;
  category?: { id: number } & CategoryFormValues;
  parents: Array<{ id: number; name: string }>;
}

export function CategoryDialog({ trigger, category, parents }: CategoryDialogProps) {
  return (
    <FormDialog trigger={trigger} title={category ? "Edit category" : "New category"} description="Categories group posts and get their own archive page.">
      {(close) => <CategoryForm category={category} parents={parents.filter((p) => p.id !== category?.id)} onDone={close} />}
    </FormDialog>
  );
}

function CategoryForm({ category, parents, onDone }: { category?: CategoryDialogProps["category"]; parents: CategoryDialogProps["parents"]; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? "", slug: category?.slug ?? "", description: category?.description ?? "", parentId: category?.parentId ?? null },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveCategoryAction(category?.id ?? null, values);
      if (applyFormResult(form, result, "Saved")) {
        onDone();
        router.refresh();
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="cat-name" label="Name" error={errors.name?.message}>
        <Input id="cat-name" className="h-11" aria-invalid={!!errors.name} aria-describedby={describedBy("cat-name", errors.name?.message)} {...form.register("name")} />
      </Field>
      <Field id="cat-slug" label="URL slug" error={errors.slug?.message} hint="Leave empty to create one from the name.">
        <Input id="cat-slug" className="h-11" aria-invalid={!!errors.slug} aria-describedby={describedBy("cat-slug", errors.slug?.message, "x")} {...form.register("slug")} />
      </Field>
      <Field id="cat-parent" label="Parent category" error={errors.parentId?.message}>
        <Controller
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}>
              <SelectTrigger id="cat-parent" className="h-11 w-full" aria-invalid={!!errors.parentId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None (top level)</SelectItem>
                {parents.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field id="cat-description" label="Description" error={errors.description?.message} hint="Shown at the top of the category archive.">
        <Textarea id="cat-description" rows={3} aria-describedby={describedBy("cat-description", errors.description?.message, "x")} {...form.register("description")} />
      </Field>
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
