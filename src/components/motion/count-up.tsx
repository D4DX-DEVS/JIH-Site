"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

const format = new Intl.NumberFormat("en-IN");

/**
 * A real figure that counts up once when it scrolls into view. The server renders the final
 * value, so it is correct without script; the text is updated directly to avoid re-renders.
 */
export function CountUp({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduced = useReducedMotion();
  const done = useRef(false);
  const text = (n: number) => `${format.format(Math.round(n))}${suffix}`;

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || done.current) return;
    if (!inView) {
      el.textContent = text(0);
      return;
    }
    done.current = true;
    const controls = animate(0, value, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => (el.textContent = text(v)) });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- text() only depends on suffix
  }, [inView, reduced, value, suffix]);

  return (
    <span ref={ref} className={className}>
      {text(value)}
    </span>
  );
}
