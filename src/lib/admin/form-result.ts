import type { z } from "zod";

/** Result of a save action backing a react-hook-form form. Field errors map to form fields. */
export type FormResult = { ok: true; id?: number; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function invalidResult(error: z.ZodError): FormResult {
  return {
    ok: false,
    error: "Please correct the highlighted fields.",
    fieldErrors: Object.fromEntries(error.issues.map((i) => [String(i.path[0]), i.message])),
  };
}

export function fieldError(field: string, message: string): FormResult {
  return { ok: false, error: message, fieldErrors: { [field]: message } };
}
