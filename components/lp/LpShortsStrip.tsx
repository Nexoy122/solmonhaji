"use client";

import { useEffect, useRef, useState } from "react";

// A static masonry grid of Shorts that autoplay-loop SILENTLY like GIFs — no
// controls, no play button, no loading UI (that's why these are local .mp4s, not
// YouTube embeds). Drop the files in /public/lp-shorts/ as 1.mp4 … 9.mp4.
// Each <video> is muted + loop + playsinline + autoplay, so browsers play it
// inline with zero chrome. Playback is only kicked off while on-screen (perf).
const COUNT = 9;
const SHORTS = Array.from({ length: COUNT }, (_, i) => `/lp-shorts/${i + 1}.mp4`);

// Masonry column assignment (3 columns), staggered heights for the vidIQ look.
const COLUMNS = 3;

function ShortCard({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ok, setOk] = useState(true);

  // Play only while visible; pause off-screen so we never burn CPU on the whole
  // grid at once.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.1 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#171d2b] shadow-[0_16px_50px_rgba(0,0,0,0.45)]">
      {ok ? (
        <video
          ref={ref}
          className="block aspect-[9/16] w-full object-cover"
          src={src}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          // No controls — this is intentional; it plays like a GIF.
          onError={() => setOk(false)}
        />
      ) : (
        <div className="flex aspect-[9/16] w-full items-center justify-center bg-gradient-to-br from-[#0FA5E9]/10 to-[#01D4FF]/5 p-4 text-center">
          <div>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[#01D4FF]/30 bg-[#01D4FF]/10 text-[#01D4FF]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </div>
            <p className="text-[12px] font-semibold text-white/70">Short</p>
            <p className="mt-0.5 text-[11px] text-white/35">drop {src}</p>
          </div>
        </div>
      )}
      {/* subtle depth gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/25 to-transparent" />
    </div>
  );
}

export function LpShortsStrip() {
  // Distribute into columns round-robin so it reads as masonry.
  const cols: string[][] = Array.from({ length: COLUMNS }, () => []);
  SHORTS.forEach((s, i) => cols[i % COLUMNS].push(s));

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5">
      {cols.map((col, ci) => (
        <div key={ci} className={`flex flex-col gap-4 md:gap-5 ${ci === 1 ? "mt-8 sm:mt-10" : ""}`}>
          {col.map((src) => (
            <ShortCard key={src} src={src} />
          ))}
        </div>
      ))}
    </div>
  );
}
