"use client";

import { useEffect, useRef } from "react";

// The niches we have footage for, these mirror the niche tabs in the app.
const NICHES = [
  { slug: "commentary", label: "Commentary" },
  { slug: "ranking", label: "Ranking" },
  { slug: "animation", label: "Animation" },
  { slug: "gaming", label: "Gaming" },
  { slug: "captions", label: "Captions Only" },
  { slug: "edits", label: "Edits & Montage" },
  { slug: "memes", label: "Memes" },
];

function NicheCard({ slug, label }: { slug: string; label: string }) {
  return (
    <div className="relative w-[150px] shrink-0 border-2 border-black bg-[#161616] shadow-[4px_4px_0_0_#000] sm:w-[172px]">
      <video
        src={`/niches/${slug}.mp4`}
        poster={`/niches/${slug}.jpg`}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        aria-label={`${label} Shorts example`}
        className="block aspect-[9/16] w-full object-cover"
      />
      {/* niche label, YouTube-ish chip */}
      <span className="absolute left-1.5 top-1.5 border-2 border-black bg-[#F0C020] px-1.5 py-0.5 text-[10px] font-black uppercase leading-none tracking-wide text-black">
        {label}
      </span>
    </div>
  );
}

export function BhNicheStrip() {
  const trackRef = useRef<HTMLDivElement>(null);

  // Pause every clip while the strip is off-screen, 14 tiles (7 × 2 for the
  // seamless loop) decoding in a background tab would be wasteful.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        el.querySelectorAll("video").forEach((v) => {
          if (entry.isIntersecting) v.play().catch(() => {});
          else v.pause();
        });
      },
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden border-b-4 bh-border bg-[#0F0F0F] py-8">
      {/* heading strip */}
      <div className="mx-auto mb-6 flex max-w-7xl items-center gap-3 px-4 md:px-8">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#FF0033]" />
        <p className="text-[12px] font-bold uppercase tracking-widest text-white/60">
          Real Shorts we analyzed, across every niche
        </p>
      </div>

      {/* Marquee. The animation translates -50%, so the track must be exactly two
          identical halves, and each half has to be wider than the viewport or a
          gap appears at the seam. 7 cards ≈ 1250px, so we repeat the set 3× per
          half (≈3750px) to cover ultra-wide screens. `gap` is on every child via
          mr, not the flex gap, so the seam spacing matches too. */}
      <div ref={trackRef} className="flex w-max lp-marquee">
        {Array.from({ length: 6 }).flatMap((_, rep) =>
          NICHES.map((n) => (
            <div key={`${n.slug}-${rep}`} className="mr-3 shrink-0">
              <NicheCard slug={n.slug} label={n.label} />
            </div>
          ))
        )}
      </div>

      {/* edge fades so cards enter/exit softly */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0F0F0F] to-transparent" />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0F0F0F] to-transparent" />
    </section>
  );
}
