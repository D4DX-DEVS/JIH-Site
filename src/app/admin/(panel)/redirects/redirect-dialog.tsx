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
import { redirectSchema, type RedirectFormValues } from "@/lib/validation/admin";
import { saveRedirectAction } from "./actions";

// Next.js answers with 308/307 (the method-preserving equivalents of 301/302), so only the kind is a real choice.
const CODES = [
  { value: 301, label: "Permanent" },
  { value: 302, label: "Temporary" },
] as const;
const asKind = (code: number | undefined) => (code === 302 || code === 307 ? 302 : 301);

export function RedirectDialog({ trigger, redirect }: { trigger: ReactNode; redirect?: { id: number } & RedirectFormValues }) {
  return (
    <FormDialog trigger={trigger} title={redirect ? "Edit redirect" : "Add redirect"} description="Send visitors and search engines from an old address to its new one.">
      {(close) => <RedirectForm redirect={redirect} onDone={close} />}
    </FormDialog>
  );
}

function RedirectForm({ redirect, onDone }: { redirect?: { id: number } & RedirectFormValues; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<RedirectFormValues>({
    resolver: zodResolver(redirectSchema),
    defaultValues: { fromPath: redirect?.fromPath ?? "", toPath: redirect?.toPath ?? "", statusCode: asKind(redirect?.statusCode) },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      if (applyFormResult(form, await saveRedirectAction(redirect?.id ?? null, values), "Saved")) {
        onDone();
        router.refresh();
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="redirect-from" label="Old address" error={errors.fromPath?.message} hint="The path only, e.g. /old-page/ — leave out the domain.">
        <Input id="redirect-from" className="h-9" placeholder="/old-page/" aria-invalid={!!errors.fromPath} aria-describedby={describedBy("redirect-from", errors.fromPath?.message, "x")} {...form.register("fromPath")} />
      </Field>
      <Field id="redirect-to" label="New address" error={errors.toPath?.message} hint="A path on this site like /news/, or a full https:// address.">
        <Input id="redirect-to" className="h-9" placeholder="/news/" aria-invalid={!!errors.toPath} aria-describedby={describedBy("redirect-to", errors.toPath?.message, "x")} {...form.register("toPath")} />
      </Field>
      <Field id="redirect-code" label="Type" error={errors.statusCode?.message} hint="Permanent (sent as 308) tells search engines to index the new address. Use temporary (307) only if the old address will come back.">
        <Controller
          control={form.control}
          name="statusCode"
          render={({ field }) => (
            <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
              <SelectTrigger id="redirect-code" className="h-9 w-full" aria-describedby="redirect-code-hint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CODES.map((c) => (
                  <SelectItem key={c.value} value={String(c.value)}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
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
