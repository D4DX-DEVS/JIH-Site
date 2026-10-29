import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  id?: string;
  title: ReactNode;
  /** One line under the title saying what the section holds. */
  lead?: string;
  link?: { href: string; label: string };
  tone?: "light" | "dark";
  className?: string;
}

/** Section title with a short gold rule, an optional lead and a "see all" link that slides on hover. */
export function SectionHeading({ id, title, lead, link, tone = "light", className }: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <Reveal className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        <span aria-hidden="true" className="mb-4 block h-1 w-12 rounded-full bg-gradient-to-r from-gold to-maroon" />
        <h2 id={id} className={cn("font-heading text-step-3 font-extrabold leading-[1.1] tracking-tight", dark ? "text-white" : "text-ink")}>
          {title}
        </h2>
        {lead ? <p className={cn("mt-3 text-lg leading-relaxed", dark ? "text-on-navy-soft" : "text-ink-soft")}>{lead}</p> : null}
      </div>
      {link ? (
        <ArrowLink href={link.href} tone={tone} className="self-start sm:self-auto">
          {link.label}
        </ArrowLink>
      ) : null}
    </Reveal>
  );
}

/** Text link with an arrow that nudges right on hover. */
export function ArrowLink({ href, children, tone = "light", className }: { href: string; children: ReactNode; tone?: "light" | "dark"; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors duration-300",
        tone === "dark" ? "border-white/25 text-white hover:border-white hover:bg-white hover:text-navy" : "border-navy/15 text-navy hover:border-navy hover:bg-navy hover:text-white",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  );
}

const BUTTON = {
  primary: "bg-maroon text-white shadow-[0_10px_30px_-12px_rgb(126_17_70/0.7)] hover:bg-maroon-deep",
  light: "bg-white text-navy hover:bg-mist",
  ghost: "border border-white/30 text-white backdrop-blur-sm hover:border-white hover:bg-white/10",
  navy: "bg-navy text-white hover:bg-navy-deep",
} as const;

/** Pill button rendered as a link; lifts slightly on hover and presses in on tap. */
export function ButtonLink({ href, children, variant = "primary", className, external }: { href: string; children: ReactNode; variant?: keyof typeof BUTTON; className?: string; external?: boolean }) {
  const classes = cn(
    "group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
    BUTTON[variant],
    className,
  );
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  // tel:, mailto: and other non-route links are plain anchors.
  return !href.startsWith("/") ? (
    <a href={href} className={classes}>
      {children}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
