import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { isPasswordHash } from "@/lib/auth/password";
import { getAdminCredentials, getAdminSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getAdminSession()) redirect("/admin/");
  const next = (await searchParams).next;
  const credentials = getAdminCredentials();
  const setupProblem = !credentials ? (
    <>
      Admin credentials are not configured on this server. Set <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD_HASH</code>.
    </>
  ) : !isPasswordHash(credentials.passwordHash) ? (
    <>
      <code>ADMIN_PASSWORD_HASH</code> holds a plain password, not a hash, so no login can succeed. Run <code>npm run admin:hash-password</code> and paste the
      line it prints.
    </>
  ) : null;
  return (
    <main id="main" className="grid min-h-svh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-[var(--admin-rail)] p-12 text-white lg:flex xl:p-16">
        <Image src="/brand/logo-white.png" alt="Jamaat-e-Islami Hind Kerala" width={768} height={225} className="h-14 w-auto self-start" priority />
        <div className="max-w-md">
          <p className="font-heading text-4xl leading-tight font-bold tracking-tight xl:text-5xl">The content desk for jihkerala.org</p>
          <p className="mt-5 text-lg text-white/70">Publish news, keep pages current, and manage leaders, galleries and media for the website.</p>
        </div>
        <Link href="/" className="inline-flex items-center gap-2 self-start text-sm text-white/70 transition-colors hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to the website
        </Link>
      </aside>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Image src="/brand/logo-blue.png" alt="Jamaat-e-Islami Hind Kerala" width={768} height={225} className="mb-10 h-11 w-auto lg:hidden" priority />
          <h1 className="font-heading text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">Sign in to manage the website.</p>
          {setupProblem ? (
            <p role="alert" className="mt-6 flex gap-2.5 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{setupProblem}</span>
            </p>
          ) : null}
          <div className="mt-8">
            <LoginForm next={typeof next === "string" ? next : "/admin/"} />
          </div>
          <Link href="/" className="mt-10 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to the website
          </Link>
        </div>
      </section>
    </main>
  );
}
