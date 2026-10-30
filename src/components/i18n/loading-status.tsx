"use client";

import type { ReactNode } from "react";
import { useI18n } from "./i18n-provider";

/**
 * The live region around a loading skeleton, labelled in the reader's language. A client component
 * on purpose: Suspense fallbacks are prerendered into the static shell, where the label must come from
 * the layout's locale rather than from a server lookup.
 */
export function LoadingStatus({ what = "page", className, children }: { what?: "page" | "posts"; className?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={what === "posts" ? t.post.loading : t.home.loading} className={className}>
      {children}
    </div>
  );
}
