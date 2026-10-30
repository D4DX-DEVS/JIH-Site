"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/i18n-provider";

/** Copies the article address; the share-by-app links next to it are plain anchors. */
export function CopyLinkButton({ url }: { url: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t.post.linkCopied);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t.post.copyFailed);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/80 bg-white px-4 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-navy hover:text-navy"
    >
      {copied ? <Check className="size-4 text-emerald-700" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
      {copied ? t.post.copied : t.post.copyLink}
    </button>
  );
}
