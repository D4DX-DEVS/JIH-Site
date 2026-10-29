/* eslint-disable @next/next/no-img-element -- media is served from R2 with pre-built size variants via srcset */
import { mediaUrl, srcSetFor, type MediaRef } from "@/lib/media-url";
import { cn } from "@/lib/utils";

interface ResponsiveImageProps {
  media: MediaRef;
  /** Used when the media item has no alt text of its own. Pass "" for decorative images. */
  fallbackAlt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}

export function ResponsiveImage({ media, fallbackAlt, sizes, className, priority = false }: ResponsiveImageProps) {
  return (
    <img
      src={mediaUrl(media.r2Key)}
      srcSet={srcSetFor(media)}
      sizes={sizes}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      alt={media.altText || fallbackAlt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn("block h-auto w-full bg-tint object-cover", className)}
    />
  );
}
