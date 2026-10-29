import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { loginAttempts, sessions } from "@/db/schema";
import { ADMIN_SESSION_COOKIE as COOKIE_NAME } from "./cookie";
import { isPasswordHash, randomToken, sha256Hex, verifyPassword } from "./password";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 1000 * 60 * 15;

export interface AdminSession {
  actor: string;
  expiresAt: string;
}

interface AdminCredentials {
  email: string;
  passwordHash: string;
}

/** Credentials come only from server environment variables (never NEXT_PUBLIC_*). */
export function getAdminCredentials(): AdminCredentials | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!email || !passwordHash) return null;
  return { email, passwordHash };
}

export async function getClientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return sha256Hex(`ip:${ip}`);
}

async function isRateLimited(ipHash: string): Promise<boolean> {
  const db = await getDb();
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MS).toISOString();
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.ipHash, ipHash), eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since)));
  return (row?.count ?? 0) >= MAX_FAILED_ATTEMPTS;
}

export type LoginResult = { ok: true } | { ok: false; error: "invalid" | "rate_limited" | "not_configured" | "not_hashed" };

export async function attemptLogin(email: string, password: string): Promise<LoginResult> {
  const credentials = getAdminCredentials();
  if (!credentials) return { ok: false, error: "not_configured" };
  if (!isPasswordHash(credentials.passwordHash)) return { ok: false, error: "not_hashed" };

  const db = await getDb();
  const ipHash = await getClientIpHash();
  if (await isRateLimited(ipHash)) return { ok: false, error: "rate_limited" };

  // Always run the hash so response time does not reveal whether the email matched.
  const passwordOk = await verifyPassword(password, credentials.passwordHash);
  const ok = passwordOk && email.trim().toLowerCase() === credentials.email;
  await db.insert(loginAttempts).values({ ipHash, success: ok });
  if (!ok) return { ok: false, error: "invalid" };

  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 200);
  await db.insert(sessions).values({ id: await sha256Hex(token), actor: credentials.email, expiresAt, ipHash, userAgent });
  // Housekeeping: expired sessions and attempts older than a day.
  const now = new Date().toISOString();
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 864e5).toISOString()));

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
  return { ok: true };
}

/** Returns the current admin session, or null. Validates against D1 on every call. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || token.length > 100) return null;
  const db = await getDb();
  const [row] = await db
    .select({ actor: sessions.actor, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(and(eq(sessions.id, await sha256Hex(token)), gt(sessions.expiresAt, new Date().toISOString())))
    .limit(1);
  if (!row) return null;
  // Credentials rotated or removed: old sessions stop working.
  const credentials = getAdminCredentials();
  if (!credentials || credentials.email !== row.actor) return null;
  return row;
}

/** Use at the top of every admin page and server action. Redirects to the login page if unauthenticated. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login/");
  return session;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, await sha256Hex(token)));
  }
  store.delete(COOKIE_NAME);
}
