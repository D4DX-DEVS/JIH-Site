// Fluent Forms submissions from the WordPress admin extract → form_submissions.
// Historical entries are imported as "read"; likely spam (links, Cyrillic text) as "archived", so the
// inbox only shows submissions made on the new site. Idempotent through the ledger (one row per entry).
import { eq, sql } from "drizzle-orm";
import * as schema from "../../../src/db/schema";
import { DATA, readJson, type Db, type Ledger } from "./context";
import { access } from "node:fs/promises";
import path from "node:path";

interface FormEntry {
  id: number;
  formId: number;
  formTitle: string;
  status: string;
  createdAt: string;
  response: Record<string, unknown>;
}

const SPAM = /https?:\/\/|www\.|\[url|[Ѐ-ӿ]/i;

const text = (v: unknown): string =>
  v == null ? "" : typeof v === "object" ? Object.values(v).filter(Boolean).map(String).join(" ").trim() : String(v).trim();

/** First non-empty field among several spellings (the contact form changed field names over time). */
const field = (r: Record<string, unknown>, ...keys: string[]) => keys.map((k) => text(r[k])).find(Boolean) ?? "";

export async function importFormEntries(db: Db, ledger: Ledger): Promise<void> {
  try {
    await access(path.join(DATA, "admin", "form-entries.json"));
  } catch {
    return;
  }
  const entries = await readJson<FormEntry[]>("admin/form-entries.json");
  const previous = await db
    .select({ sourceId: schema.migrationItems.sourceId, targetId: schema.migrationItems.targetId })
    .from(schema.migrationItems)
    .where(sql`${schema.migrationItems.sourceType} = 'form-entry'`);
  const targetOf = new Map(previous.filter((p) => p.targetId).map((p) => [p.sourceId, Number(p.targetId)]));

  for (const e of entries) {
    const r = e.response;
    const contact = /contact/i.test(e.formTitle);
    const name = field(r, "names", "Name", "name");
    const subject = field(r, "subject", "Subject");
    const message = contact ? field(r, "message", "Comment", "Message") : `Newsletter sign-up (${e.formTitle})`;
    const spam = SPAM.test(`${name} ${subject} ${message}`);
    // WordPress timezone is unset (UTC), so Fluent Forms' local created_at is already UTC.
    const at = `${e.createdAt.replace(" ", "T")}.000Z`;
    const values = {
      form: contact ? "contact" : "subscription",
      name,
      email: field(r, "email", "Email", "email_1"),
      subject,
      message,
      status: spam ? ("archived" as const) : ("read" as const),
      createdAt: at,
      updatedAt: at,
    };
    const existingId = targetOf.get(String(e.id));
    const [row] = existingId
      ? await db.update(schema.formSubmissions).set(values).where(eq(schema.formSubmissions.id, existingId)).returning({ id: schema.formSubmissions.id })
      : await db.insert(schema.formSubmissions).values(values).returning({ id: schema.formSubmissions.id });
    await ledger.record({
      sourceType: "form-entry",
      sourceId: e.id,
      status: "imported",
      targetTable: "form_submissions",
      targetId: row.id,
      message: `${e.formTitle}${spam ? "; likely spam, archived" : ""}`,
    });
  }
}
