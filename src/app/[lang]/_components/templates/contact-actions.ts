"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { formSubmissions } from "@/db/schema";
import { getClientIpHash } from "@/lib/auth/session";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { contactSchemaFor, type ContactInput, type ContactResult } from "@/lib/validation/contact";

const MAX_PER_WINDOW = 3;
const WINDOW_MS = 10 * 60 * 1000;

/** `locale` comes from the form: server actions have no route params. Anything unknown answers in Malayalam. */
export async function submitContact(input: ContactInput, locale: unknown): Promise<ContactResult> {
  const t = dictionaries[isLocale(locale) ? locale : DEFAULT_LOCALE].contact.errors;
  const parsed = contactSchemaFor(t).safeParse(input);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { ok: false, error: t.fixFields, fieldErrors };
  }
  // Bots that fill the hidden field get a success response and nothing is stored.
  if (parsed.data.website) return { ok: true };

  const db = await getDb();
  const ipHash = await getClientIpHash();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)` })
    .from(formSubmissions)
    .where(and(eq(formSubmissions.ipHash, ipHash), gt(formSubmissions.createdAt, since)));
  if (recent >= MAX_PER_WINDOW) {
    return { ok: false, error: t.tooMany };
  }

  const { name, email, phone, subject, message } = parsed.data;
  await db.insert(formSubmissions).values({ form: "contact", name, email, phone, subject, message, ipHash });
  return { ok: true };
}
