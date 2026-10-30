"use client";

/* eslint-disable @next/next/no-img-element -- R2 media with stored srcset variants */
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const HOLD_MS = 6500;

export interface Slide {
  src: string;
  srcSet?: string;
  width: number | null;
  height: number | null;
}

/**
 * Background photographs of the movement's own events: slow Ken Burns drift, crossfade every
 * 6.5 s, progress bars that double as slide buttons. Pauses while the tab is hidden; with
 * reduced motion only the first photograph shows.
 */
export function HeroSlideshow({ slides, controlsClassName }: { slides: Slide[]; controlsClassName?: string }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  // The controls and Ken Burns class depend on this, so it must match the server render while hydrating.
  const reduced = usePrefersReducedMotion();
  const animated = !reduced && slides.length > 1;

  const go = (next: number) => {
    setPrevious(index);
    setIndex(next);
  };

  useEffect(() => {
    if (!animated || paused) return;
    const timer = window.setTimeout(() => {
      setPrevious(index);
      setIndex((index + 1) % slides.length);
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [animated, paused, index, slides.length]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <>
      <div className="absolute inset-0" aria-hidden="true">
        {slides.map((s, i) => {
          const on = i === index;
          return (
            <img
              key={s.src}
              src={s.src}
              srcSet={s.srcSet}
              sizes="100vw"
              alt=""
              width={s.width ?? undefined}
              height={s.height ?? undefined}
              fetchPriority={i === 0 ? "high" : "low"}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className={cn(
                "absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-in-out",
                on ? "opacity-100" : "opacity-0",
                animated && (on || i === previous) && "animate-kenburns",
              )}
            />
          );
        })}
      </div>
      {animated ? (
        <div className={cn("flex items-center gap-2", controlsClassName)} role="group" aria-label={t.gallery.photographs}>
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => go(i)}
              aria-label={t.gallery.showPhoto(i + 1, slides.length)}
              aria-current={i === index}
              className="group flex h-11 items-center"
            >
              <span className={cn("relative block h-1 overflow-hidden rounded-full bg-white/30 transition-all duration-500", i === index ? "w-12" : "w-6 group-hover:bg-white/60")}>
                {i === index ? (
                  <span
                    key={`${index}-${paused}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-white"
                    style={{ animation: paused ? "none" : `hero-progress ${HOLD_MS}ms linear forwards` }}
                  />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
