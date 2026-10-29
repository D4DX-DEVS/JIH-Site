import { z } from "zod";

/** Shared by the contact form (client) and its server action. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100, "Name is too long"),
  email: z.string().trim().max(200).pipe(z.email("Enter a valid email address")),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long")
    .regex(/^[+\d][\d\s-]*$|^$/, "Use digits, spaces, + or -")
    .optional()
    .default(""),
  subject: z.string().trim().max(150, "Subject is too long").optional().default(""),
  message: z.string().trim().min(10, "Write at least 10 characters").max(5000, "Message is too long"),
  /** Honeypot: hidden from people, filled by bots. */
  website: z.string().max(0).optional().default(""),
});

export type ContactInput = z.input<typeof contactSchema>;

export type ContactResult = { ok: true } | { ok: false; error: string; fieldErrors?: Partial<Record<keyof ContactInput, string>> };
