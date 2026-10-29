"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { MediaPickerDialog } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { pickVariant } from "@/lib/media-url";
import type { PickerMedia } from "../media/actions";

interface GalleryImagesProps {
  images: PickerMedia[];
  onChange: (images: PickerMedia[]) => void;
  error?: string;
}

/** Ordered image list for a gallery: add from the media library, reorder, remove. */
export function GalleryImages({ images, onChange, error }: GalleryImagesProps) {
  const [open, setOpen] = useState(false);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const add = (m: PickerMedia) => {
    if (images.some((i) => i.id === m.id)) {
      toast.info("That image is already in this gallery");
      return;
    }
    onChange([...images, m]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {images.length === 1 ? "1 image" : `${images.length} images`}
        </p>
        <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(true)}>
          <ImagePlus className="size-4" aria-hidden="true" /> Add images
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {images.length ? (
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, index) => {
            const name = img.title || img.altText || `Image ${index + 1}`;
            return (
              <li key={img.id} className="flex h-full flex-col overflow-hidden rounded-lg border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element -- R2 media with stored variants; next/image is unoptimized here */}
                <img src={pickVariant(img, 300)} alt={img.altText} loading="lazy" className="aspect-[4/3] w-full bg-muted object-cover" />
                <div className="flex flex-1 items-center gap-2 p-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="tabular-nums text-muted-foreground">{index + 1}.</span> {name}
                  </span>
                  <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Move ${name} earlier`} disabled={index === 0} onClick={() => move(index, index - 1)}>
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Move ${name} later`} disabled={index === images.length - 1} onClick={() => move(index, index + 1)}>
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-11 text-destructive" aria-label={`Remove ${name} from gallery`} onClick={() => onChange(images.filter((i) => i.id !== img.id))}>
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No images yet. Add images from the media library or upload new ones.</div>
      )}
      <MediaPickerDialog open={open} onOpenChange={setOpen} onSelect={add} kind="image" title="Add an image to the gallery" />
    </div>
  );
}
