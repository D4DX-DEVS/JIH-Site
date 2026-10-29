"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Floating button at the lower right that appears once the reader is about a screen down the page. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  function toTop() {
    // Focus moves to the start of the content so keyboard and screen-reader users land there too.
    document.getElementById("main")?.focus({ preventScroll: true });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      title="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        "fixed bottom-5 right-5 z-40 inline-flex size-12 items-center justify-center rounded-full bg-navy text-white shadow-lift transition-all duration-300 hover:bg-maroon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none sm:bottom-8 sm:right-8",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}
