"use client";

import { useEffect } from "react";
import { House, RotateCcw } from "lucide-react";
import Link from "@/components/i18n/link";
import { useI18n } from "@/components/i18n/i18n-provider";
import { ErrorState } from "@/components/shared/states";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="lattice-ink bg-mist py-16 [--lattice-mask:radial-gradient(ellipse_at_center,#000_20%,transparent_70%)] lg:py-24">
      <div className="page-frame mx-auto max-w-3xl">
        <ErrorState title={t.error.title} description={t.error.description}>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-navy px-5 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-navy-deep"
            >
              <RotateCcw className="size-4 transition-transform duration-500 group-hover:-rotate-180" aria-hidden="true" /> {t.error.retryButton}
            </button>
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/80 bg-white px-5 font-semibold text-navy transition-all hover:-translate-y-0.5 hover:border-navy">
              <House className="size-4" aria-hidden="true" /> {t.error.homeButton}
            </Link>
          </div>
          {error.digest ? <p className="text-sm text-ink-soft">Reference: {error.digest}</p> : null}
        </ErrorState>
      </div>
    </div>
  );
}
