"use client";

/* eslint-disable @next/next/no-img-element -- YouTube thumbnail */
import { useState } from "react";
import { Play } from "lucide-react";
import { youtubeThumb } from "@/lib/routes";

/**
 * Click-to-load YouTube player: shows the thumbnail and loads the privacy-enhanced iframe
 * only when asked. Without script the link opens the video on YouTube.
 */
export function YouTubeEmbed({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full bg-ink"
      />
    );
  }
  return (
    <a
      href={`https://www.youtube.com/watch?v=${id}`}
      onClick={(e) => {
        e.preventDefault();
        setPlaying(true);
      }}
      className="group relative block aspect-video w-full overflow-hidden bg-ink"
      aria-label={`Play video: ${title}`}
    >
      <img src={youtubeThumb(id)} alt="" loading="lazy" decoding="async" className="size-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
      <span className="absolute left-1/2 top-1/2 inline-flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-maroon text-white shadow-[0_10px_30px_-8px_rgb(126_17_70/0.9)] ring-8 ring-white/20 transition-all duration-300 group-hover:scale-110 group-hover:ring-white/30 sm:size-20">
        <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
      </span>
    </a>
  );
}
