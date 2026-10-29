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
import { navItemSchema, type NavItemFormValues } from "@/lib/validation/admin";
import { saveNavItemAction } from "./actions";

const TOP = "top";

interface NavItemDialogProps {
  trigger: ReactNode;
  menu: "header" | "footer";
  item?: { id: number; label: string; url: string; parentId: number | null; hasChildren: boolean };
  /** Top-level items of this menu, offered as parents. */
  parents: Array<{ id: number; label: string }>;
  defaultParentId?: number | null;
}

export function NavItemDialog({ trigger, menu, item, parents, defaultParentId = null }: NavItemDialogProps) {
  return (
    <FormDialog trigger={trigger} title={item ? "Edit menu item" : "Add menu item"} description={`${menu === "header" ? "Header" : "Footer"} menu`}>
      {(close) => <NavItemForm menu={menu} item={item} parents={parents.filter((p) => p.id !== item?.id)} defaultParentId={defaultParentId} onDone={close} />}
    </FormDialog>
  );
}

function NavItemForm({ menu, item, parents, defaultParentId, onDone }: Omit<NavItemDialogProps, "trigger"> & { onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<NavItemFormValues>({
    resolver: zodResolver(navItemSchema),
    defaultValues: { menu, label: item?.label ?? "", url: item?.url ?? "", parentId: item ? item.parentId : defaultParentId, sortOrder: 0 },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      if (applyFormResult(form, await saveNavItemAction(item?.id ?? null, values), "Saved")) {
        onDone();
        router.refresh();
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="nav-label" label="Label" error={errors.label?.message}>
        <Input id="nav-label" className="h-11" aria-invalid={!!errors.label} aria-describedby={describedBy("nav-label", errors.label?.message)} {...form.register("label")} />
      </Field>
      <Field id="nav-url" label="Link" error={errors.url?.message} hint="A path like /about-us/ or a full https:// address. A top-level item with sub-items may leave this empty.">
        <Input id="nav-url" className="h-11" inputMode="url" aria-invalid={!!errors.url} aria-describedby={describedBy("nav-url", errors.url?.message, "x")} {...form.register("url")} />
      </Field>
      {item?.hasChildren ? (
        <p className="text-sm text-muted-foreground">This item has sub-items, so it stays at the top level.</p>
      ) : (
        <Field id="nav-parent" label="Position" error={errors.parentId?.message}>
          <Controller
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : TOP} onValueChange={(v) => field.onChange(v === TOP ? null : Number(v))}>
                <SelectTrigger id="nav-parent" className="h-11 w-full" aria-invalid={!!errors.parentId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOP}>Top level</SelectItem>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      Under “{p.label}”
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      )}
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
