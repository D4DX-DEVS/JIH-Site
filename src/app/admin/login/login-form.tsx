"use client";

import { useActionState, useState, type KeyboardEvent } from "react";
import { ArrowRight, CircleAlert, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "../auth-actions";

const FIELD = "h-12 rounded-xl bg-card pl-11 text-base md:text-sm";
const FIELD_ICON = "pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const trackCapsLock = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState("CapsLock"));

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error ? (
        <p role="alert" className="flex gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className={FIELD_ICON} aria-hidden="true" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@jihkerala.org"
            required
            className={FIELD}
            aria-invalid={!!state.fieldErrors?.email}
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          />
        </div>
        {state.fieldErrors?.email ? (
          <p id="email-error" className="text-sm text-destructive">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className={FIELD_ICON} aria-hidden="true" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${FIELD} pr-12`}
            onKeyUp={trackCapsLock}
            onKeyDown={trackCapsLock}
            onBlur={() => setCapsLock(false)}
            aria-invalid={!!state.fieldErrors?.password}
            aria-describedby={[state.fieldErrors?.password ? "password-error" : "", capsLock ? "caps-lock" : ""].filter(Boolean).join(" ") || undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            aria-controls="password"
            className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>
        {capsLock ? (
          <p id="caps-lock" className="text-sm text-amber-700">
            Caps Lock is on.
          </p>
        ) : null}
        {state.fieldErrors?.password ? (
          <p id="password-error" className="text-sm text-destructive">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="h-12 w-full rounded-xl text-base hover:bg-[var(--admin-navy-deep)]" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Signing in…" : "Sign in"}
        {pending ? null : <ArrowRight className="size-4" aria-hidden="true" />}
      </Button>
    </form>
  );
}
