import { z } from "zod";
import { dictionaries } from "@/lib/i18n/dictionaries";

export type ContactMessages = (typeof dictionaries)["en"]["contact"]["errors"];

/** Shared by the contact form (client) and its server action, with messages in the reader's language. */
export function contactSchemaFor(m: ContactMessages) {
  return z.object({
    name: z.string().trim().min(2, m.nameRequired).max(100, m.nameTooLong),
    email: z.string().trim().max(200).pipe(z.email(m.email)),
    phone: z
      .string()
      .trim()
      .max(30, m.phoneTooLong)
      .regex(/^[+\d][\d\s-]*$|^$/, m.phoneFormat)
      .optional()
      .default(""),
    subject: z.string().trim().max(150, m.subjectTooLong).optional().default(""),
    message: z.string().trim().min(10, m.messageTooShort).max(5000, m.messageTooLong),
    /** Honeypot: hidden from people, filled by bots. */
    website: z.string().max(0).optional().default(""),
  });
}

export const contactSchema = contactSchemaFor(dictionaries.en.contact.errors);

export type ContactInput = z.input<typeof contactSchema>;

export type ContactResult = { ok: true } | { ok: false; error: string; fieldErrors?: Partial<Record<keyof ContactInput, string>> };
