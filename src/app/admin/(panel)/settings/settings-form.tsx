"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, type FieldValues, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Panel } from "@/components/admin/admin-ui";
import { applyFormResult } from "@/components/admin/form-dialog";
import { Field, describedBy } from "@/components/admin/form-bits";
import { MediaField } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ADMIN_SETTINGS_SCHEMAS, type AdminSettingsKey } from "@/lib/validation/settings";
import type { PickerMedia } from "../media/actions";
import { saveSettingsAction } from "./actions";

export interface SettingsField {
  name: string;
  label: string;
  kind: "text" | "textarea" | "email" | "url" | "tel" | "image";
  hint?: string;
  dir?: "auto";
}

interface SettingsFormProps {
  group: AdminSettingsKey;
  title: string;
  description?: string;
  fields: SettingsField[];
  initial: Record<string, unknown>;
  images?: Record<string, PickerMedia | null>;
}

/** One settings group as its own form with its own Save button. */
export function SettingsForm({ group, title, description, fields, initial, images = {} }: SettingsFormProps) {
  const [pending, startTransition] = useTransition();
  const [previews, setPreviews] = useState(images);
  const form = useForm<FieldValues>({
    // The schema is chosen by group; the field list mirrors its keys.
    resolver: zodResolver(ADMIN_SETTINGS_SCHEMAS[group] as never),
    defaultValues: initial,
  });
  const { errors, isDirty } = form.formState;
  const message = (name: string) => errors[name]?.message as string | undefined;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      if (applyFormResult(form, await saveSettingsAction(group, values), "Saved")) form.reset(values);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <Panel
        title={title}
        description={description}
        actions={
          <Button type="submit" className="h-11 sm:h-9" disabled={pending || !isDirty}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Saving…" : "Save"}
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((f) => {
            const id = `${group}-${f.name}`;
            const error = message(f.name);
            if (f.kind === "image") {
              return (
                <div key={f.name} className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium">{f.label}</span>
                  {f.hint ? <p className="text-xs text-muted-foreground">{f.hint}</p> : null}
                  <Controller
                    control={form.control}
                    name={f.name as Path<FieldValues>}
                    render={({ field }) => (
                      <MediaField
                        label="Image"
                        value={(field.value as number | null) ?? null}
                        preview={previews[f.name] ?? null}
                        onChange={(m) => {
                          setPreviews((p) => ({ ...p, [f.name]: m }));
                          field.onChange(m?.id ?? null);
                        }}
                      />
                    )}
                  />
                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                </div>
              );
            }
            const common = {
              id,
              "aria-invalid": !!error,
              "aria-describedby": describedBy(id, error, f.hint),
              ...form.register(f.name),
            };
            return (
              <div key={f.name} className={f.kind === "textarea" ? "md:col-span-2" : undefined}>
                <Field id={id} label={f.label} error={error} hint={f.hint}>
                  {f.kind === "textarea" ? (
                    <Textarea rows={3} dir={f.dir} {...common} />
                  ) : (
                    <Input type={f.kind} className="h-11" dir={f.dir} inputMode={f.kind === "url" ? "url" : undefined} {...common} />
                  )}
                </Field>
              </div>
            );
          })}
        </div>
      </Panel>
    </form>
  );
}
