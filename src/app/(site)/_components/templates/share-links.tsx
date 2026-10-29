"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";

/** Copies the article address; the share-by-app links next to it are plain anchors. */
export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link. Copy it from the address bar instead.");
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/80 bg-white px-4 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-navy hover:text-navy"
    >
      {copied ? <Check className="size-4 text-emerald-700" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
