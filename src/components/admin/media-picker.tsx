"use client";

/* eslint-disable @next/next/no-img-element -- admin thumbnails from R2 */
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { FileText, ImagePlus, Loader2, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listMediaAction, type PickerMedia } from "@/app/admin/(panel)/media/actions";
import { mediaUrl, pickVariant } from "@/lib/media-url";
import { ACCEPT_ATTRIBUTE } from "@/lib/upload-rules";
import { cn } from "@/lib/utils";
import { uploadMedia } from "./media-upload";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: PickerMedia) => void;
  kind?: "image" | "document";
  title?: string;
}

export function MediaPickerDialog({ open, onOpenChange, onSelect, kind = "image", title = "Choose media" }: MediaPickerDialogProps) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ data: PickerMedia[]; totalPages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    (p: number, query: string) =>
      startLoading(async () => {
        try {
          setError(null);
          const r = await listMediaAction({ page: p, q: query, kind });
          setResult({ data: r.data, totalPages: r.totalPages });
        } catch {
          setError("Could not load the media library.");
        }
      }),
    [kind],
  );

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(page, q), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [open, page, q, load]);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const res = await uploadMedia(file);
      if (res.ok) {
        toast.success(`Uploaded ${file.name}`);
        if (files.length === 1) {
          onSelect(res.media);
          onOpenChange(false);
        }
      } else toast.error(`${file.name}: ${res.error}`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    load(1, q);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Pick an item from the library or upload a new {kind === "image" ? "image" : "file"}.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by title or file name" aria-label="Search media" className="h-11 pl-9" />
          </div>
          <input ref={fileRef} type="file" accept={ACCEPT_ATTRIBUTE} multiple className="sr-only" id="picker-upload" onChange={(e) => onUpload(e.target.files)} />
          <Button type="button" variant="outline" className="h-11" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
        <div className="min-h-60 flex-1 overflow-y-auto" aria-busy={loading}>
          {error ? (
            <div role="alert" className="flex flex-col items-center gap-3 py-10 text-sm text-destructive">
              {error}
              <Button variant="outline" onClick={() => load(page, q)}>Retry</Button>
            </div>
          ) : !result ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}
            </div>
          ) : result.data.length ? (
            <ul className={cn("grid grid-cols-3 gap-2 sm:grid-cols-6", loading && "opacity-60")}>
              {result.data.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(m); onOpenChange(false); }}
                    className="group block w-full overflow-hidden rounded-md border text-left focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Choose ${m.title || m.r2Key.split("/").pop()}`}
                  >
                    {m.kind === "image" ? (
                      <img src={pickVariant(m, 300)} alt="" loading="lazy" className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <span className="flex aspect-square items-center justify-center bg-muted"><FileText className="size-8 text-muted-foreground" aria-hidden="true" /></span>
                    )}
                    <span className="block truncate px-1.5 py-1 text-xs">{m.title || m.r2Key.split("/").pop()}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status" className="py-10 text-center text-sm text-muted-foreground">No media matches. Upload a file or clear the search.</p>
          )}
        </div>
        {result && result.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Page {page} of {result.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" disabled={page >= result.totalPages || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Form field: shows the chosen media and opens the picker. Value is a media id. */
export function MediaField({ value, preview, onChange, kind = "image", label }: { value: number | null; preview: PickerMedia | null; onChange: (media: PickerMedia | null) => void; kind?: "image" | "document"; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      {value && preview ? (
        <div className="flex items-center gap-3 rounded-md border p-2">
          {preview.kind === "image" ? (
            <img src={pickVariant(preview, 300)} alt="" className="size-16 rounded object-cover" />
          ) : (
            <span className="flex size-16 items-center justify-center rounded bg-muted"><FileText className="size-6" aria-hidden="true" /></span>
          )}
          <a href={mediaUrl(preview.r2Key)} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline">
            {preview.title || preview.r2Key.split("/").pop()}
          </a>
          <Button type="button" variant="ghost" size="icon" className="size-11 sm:size-9" onClick={() => onChange(null)} aria-label={`Remove ${label.toLowerCase()}`}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
      <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => setOpen(true)}>
        <ImagePlus className="size-4" aria-hidden="true" /> {value ? `Change ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`}
      </Button>
      <MediaPickerDialog open={open} onOpenChange={setOpen} onSelect={(m) => onChange(m)} kind={kind} title={`Choose ${label.toLowerCase()}`} />
    </div>
  );
}
