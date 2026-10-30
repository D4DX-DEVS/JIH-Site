"use client";

/* eslint-disable @next/next/no-img-element -- R2 media with srcset */
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { mediaUrl, pickVariant, srcSetFor, type MediaRef } from "@/lib/media-url";

interface LightboxImage extends MediaRef {
  id: number;
}

/** Grid of photographs; each opens a full-screen viewer with keyboard and swipe-free arrow navigation. */
export function GalleryGrid({ images, title }: { images: LightboxImage[]; title: string }) {
  const { t } = useI18n();
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;
  const go = useCallback((delta: number) => setIndex((i) => (i === null ? i : (i + delta + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  const current = index !== null ? images[index] : null;

  return (
    <>
      <ul className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {images.map((img, i) => (
          <li key={img.id} className="mb-3 break-inside-avoid sm:mb-4">
            <a
              href={mediaUrl(img.r2Key)}
              onClick={(e) => {
                e.preventDefault();
                setIndex(i);
              }}
              className="group relative block overflow-hidden rounded-xl bg-mist shadow-soft transition-shadow duration-300 hover:shadow-lift"
              aria-label={t.gallery.openPhoto(i + 1, images.length)}
            >
              <img
                src={pickVariant(img, 600)}
                srcSet={srcSetFor(img)}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                width={img.width ?? undefined}
                height={img.height ?? undefined}
                alt={img.altText || t.gallery.photoAlt(title, i + 1)}
                loading={i < 8 ? "eager" : "lazy"}
                decoding="async"
                className="img-zoom h-auto w-full"
              />
              <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-navy-deep/0 transition-colors duration-300 group-hover:bg-navy-deep/35">
                <span className="inline-flex size-11 scale-75 items-center justify-center rounded-full bg-white/95 text-navy opacity-0 shadow-soft transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                  <Expand className="size-5" />
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent showCloseButton={false} className="flex h-[100svh] max-h-none w-screen max-w-none items-center justify-center rounded-none border-0 bg-navy-deep/95 p-0 backdrop-blur-md sm:max-w-none">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {t.gallery.viewerDescription(index !== null ? index + 1 : 0, images.length)}
          </DialogDescription>
          {current ? (
            <img
              key={current.id}
              src={pickVariant(current, 1500)}
              srcSet={srcSetFor(current)}
              sizes="100vw"
              alt={current.altText || `${title}, photograph ${index! + 1}`}
              className="max-h-[86svh] max-w-[92vw] rounded-lg object-contain shadow-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
            />
          ) : null}
          <p className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur" aria-hidden="true">
            {index !== null ? index + 1 : 0} / {images.length}
          </p>
          <DialogClose className="absolute right-3 top-3 inline-flex size-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/25" aria-label={t.common.close}>
            <X className="size-6" aria-hidden="true" />
          </DialogClose>
          {images.length > 1 ? (
            <>
              <button type="button" onClick={() => go(-1)} aria-label={t.gallery.previousPhoto} className="absolute left-2 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:scale-105 hover:bg-white/25">
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label={t.gallery.nextPhoto} className="absolute right-2 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:scale-105 hover:bg-white/25">
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
