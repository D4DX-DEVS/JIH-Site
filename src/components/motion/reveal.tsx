"use client";

import type { ReactNode } from "react";
import { motion, stagger, useReducedMotion, type Variants } from "motion/react";

// Scroll-triggered entrances. Server Components pass content in as children, and the root
// layout's <noscript> rule keeps it visible when scripts are off.
//
// Server and client must render the same markup: React does not repair attribute mismatches
// during hydration, so a different element for reduced motion would keep the server's inline
// opacity:0 forever. Reduced motion therefore only changes how content becomes visible: at
// once, with no movement and without waiting to be scrolled into view.

const EASE = [0.22, 1, 0.36, 1] as const;
const INSTANT = { duration: 0 } as const;
const TAGS = { div: motion.div, section: motion.section, ul: motion.ul, ol: motion.ol, li: motion.li, article: motion.article, header: motion.header } as const;
type Tag = keyof typeof TAGS;

interface RevealProps {
  children: ReactNode;
  as?: Tag;
  className?: string;
  delay?: number;
  /** Starting offset in px; negative values rise from above. */
  y?: number;
  x?: number;
  scale?: number;
}

const SHOWN = { opacity: 1, y: 0, x: 0, scale: 1 };

export function Reveal({ children, as = "div", className, delay = 0, y = 28, x = 0, scale = 1 }: RevealProps) {
  const reduced = useReducedMotion();
  const Component = TAGS[as];
  const entrance = reduced
    ? { animate: SHOWN, transition: INSTANT }
    : { whileInView: SHOWN, viewport: { once: true, margin: "0px 0px -12% 0px" }, transition: { duration: 0.8, ease: EASE, delay } };
  return (
    <Component data-reveal="" className={className} initial={{ opacity: 0, y, x, scale }} {...entrance}>
      {children}
    </Component>
  );
}

const container: Variants = {
  hidden: {},
  show: { transition: { delayChildren: stagger(0.08) } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

const containerInstant: Variants = { hidden: {}, show: {} };
const itemInstant: Variants = { hidden: item.hidden, show: { opacity: 1, y: 0, transition: INSTANT } };

/** Children marked with <StaggerItem> enter one after another when the group scrolls into view. */
export function Stagger({ children, as = "div", className }: { children: ReactNode; as?: Tag; className?: string }) {
  const reduced = useReducedMotion();
  const Component = TAGS[as];
  const entrance = reduced ? { animate: "show" } : { whileInView: "show", viewport: { once: true, margin: "0px 0px -10% 0px" } };
  return (
    <Component data-reveal="" className={className} variants={reduced ? containerInstant : container} initial="hidden" {...entrance}>
      {children}
    </Component>
  );
}

export function StaggerItem({ children, as = "div", className }: { children: ReactNode; as?: Tag; className?: string }) {
  const reduced = useReducedMotion();
  const Component = TAGS[as];
  return (
    <Component data-reveal="" className={className} variants={reduced ? itemInstant : item}>
      {children}
    </Component>
  );
}
