"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/i18n-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactSchemaFor, type ContactInput } from "@/lib/validation/contact";
import { submitContact } from "./contact-actions";

const fieldClass =
  "min-h-12 rounded-xl border-border bg-white px-4 text-base shadow-none transition-colors focus-visible:border-navy focus-visible:ring-4 focus-visible:ring-navy/10 aria-invalid:border-destructive";

export function ContactForm() {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [schema] = useState(() => contactSchemaFor(t.contact.errors));
  const form = useForm<ContactInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", subject: "", message: "", website: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await submitContact(values, locale);
      if (result.ok) {
        setSent(true);
        form.reset();
        toast.success(t.contact.successMessage);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof ContactInput, { message });
      }
      toast.error(result.error);
    }),
  );

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-2xl bg-emerald-50 p-6 ring-1 ring-emerald-200">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-600 text-white">
          <CircleCheck className="size-6" aria-hidden="true" />
        </span>
        <p className="font-heading text-step-2 font-bold">{t.contact.successTitle}</p>
        <button type="button" onClick={() => setSent(false)} className="inline-flex min-h-11 items-center rounded-full bg-white px-5 font-semibold text-navy shadow-soft transition-colors hover:bg-navy hover:text-white">
          {t.contact.sendAnotherButton}
        </button>
      </div>
    );
  }

  const error = (name: keyof ContactInput) =>
    errors[name] ? (
      <p id={`${name}-error`} className="text-sm text-destructive">
        {errors[name]?.message}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label={t.contact.formLabel}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{t.contact.nameLabel}</Label>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} className={fieldClass} {...form.register("name")} />
          {error("name")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t.contact.emailLabel}</Label>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} className={fieldClass} {...form.register("email")} />
          {error("email")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t.contact.phoneLabel}</Label>
          <Input id="phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} className={fieldClass} {...form.register("phone")} />
          {error("phone")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">{t.contact.subjectLabel}</Label>
          <Input id="subject" aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "subject-error" : undefined} className={fieldClass} {...form.register("subject")} />
          {error("subject")}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">{t.contact.messageLabel}</Label>
        <Textarea id="message" rows={7} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} className={`${fieldClass} min-h-40 py-3`} {...form.register("message")} />
        {error("message")}
      </div>
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">{t.contact.honeypotLabel}</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...form.register("website")} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-maroon px-7 font-semibold text-white shadow-[0_10px_30px_-12px_rgb(126_17_70/0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-maroon-deep active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-70 sm:w-auto"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />}
        {pending ? t.contact.sending : t.contact.submitButton}
      </button>
    </form>
  );
}
