"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { attemptLogin, destroySession, getAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/admin/activity";

const loginSchema = z.object({
  email: z.string().trim().max(200).pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Enter the password").max(200),
});

export type LoginState = { error?: string; fieldErrors?: { email?: string; password?: string } };

const MESSAGES = {
  invalid: "Email or password is incorrect.",
  rate_limited: "Too many failed attempts. Wait 15 minutes and try again.",
  not_configured: "Admin login is not configured on this server. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH (see docs/DEPLOYMENT.md).",
  not_hashed: "ADMIN_PASSWORD_HASH holds a plain password, not a hash. Run `npm run admin:hash-password` and use the line it prints.",
} as const;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error).fieldErrors;
    return { fieldErrors: { email: flat.email?.[0], password: flat.password?.[0] } };
  }
  const result = await attemptLogin(parsed.data.email, parsed.data.password);
  if (!result.ok) return { error: MESSAGES[result.error] };
  await logActivity(parsed.data.email.toLowerCase(), "login", "session", "", "Signed in");
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/admin/") && !next.startsWith("//") ? next : "/admin/");
}

export async function logoutAction(): Promise<void> {
  const session = await getAdminSession();
  if (session) await logActivity(session.actor, "logout", "session", "", "Signed out");
  await destroySession();
  redirect("/admin/login/");
}
