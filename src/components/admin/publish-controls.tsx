"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "draft" | "published";

const STATUSES: { value: Status; label: string; dot: string }[] = [
  { value: "draft", label: "Draft", dot: "group-data-[state=checked]:bg-amber-500" },
  { value: "published", label: "Published", dot: "group-data-[state=checked]:bg-emerald-600" },
];

/** Draft or Published as a two-way switch: both choices in view, one click to change. */
export function StatusToggle({ id, value, onChange }: { id: string; value: Status; onChange: (value: Status) => void }) {
  return (
    <RadioGroup.Root id={id} value={value} onValueChange={(v) => onChange(v as Status)} aria-label="Status" className="grid h-10 grid-cols-2 gap-1 rounded-lg bg-[var(--admin-pill)] p-1">
      {STATUSES.map((s) => (
        <RadioGroup.Item
          key={s.value}
          value={s.value}
          className="group flex items-center justify-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-[color,background-color,box-shadow] outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-sm"
        >
          <span className={cn("size-2 rounded-full bg-muted-foreground/35 transition-colors", s.dot)} aria-hidden="true" />
          {s.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

/** Save, what state the form is in, and a link to the live page once it has one. */
export function SaveActions({ pending, saved, dirty, viewHref }: { pending: boolean; saved: boolean; dirty: boolean; viewHref: string | null }) {
  const state = !saved ? "Not saved yet" : dirty ? "Unsaved changes" : "All changes saved";
  return (
    <div className="space-y-3 border-t border-[var(--admin-rule)] pt-4">
      <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
        <span className={cn("size-1.5 rounded-full", saved && !dirty ? "bg-emerald-600" : "bg-amber-500")} aria-hidden="true" />
        {state}
      </p>
      <div className="flex gap-2">
        <Button type="submit" className="h-10 flex-1 shadow-sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Saving…" : "Save"}
        </Button>
        {viewHref ? (
          <Button asChild variant="outline" className="h-10 px-3.5">
            <a href={viewHref} target="_blank" rel="noopener">
              <ExternalLink className="size-4" aria-hidden="true" /> View
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
