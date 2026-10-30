"use client";

import { useEffect, useRef, type ComponentProps } from "react";

/**
 * A scrolling list that opens with the current page's entry (aria-current="page") in view, so a long
 * section such as Departments does not hide it below the fold. Only the list scrolls, never the page.
 */
export function ScrollToCurrent(props: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const pane = ref.current;
    const current = pane?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!pane || !current) return;
    const p = pane.getBoundingClientRect();
    const c = current.getBoundingClientRect();
    pane.scrollTop += c.top - p.top - (p.height - c.height) / 2;
    pane.scrollLeft += c.left - p.left - (p.width - c.width) / 2;
  }, []);
  return <div ref={ref} {...props} />;
}
