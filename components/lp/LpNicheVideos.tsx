"use client";

// A continuously-scrolling marquee of niche example Shorts — muted, autoplaying,
// looping YouTube embeds — so visitors instantly see the kind of content
// NicheSpy is built for. The row auto-scrolls and loops seamlessly.
const VIDEOS: { id: string; niche: string }[] = [
  { id: "_18Y3wDSJ6A", niche: "Commentary" },
  { id: "iVaDuaWzgyw", niche: "Ranking" },
  { id: "0U6OcfxYZ7U", niche: "Animation" },
  { id: "4iciY0M3t0k", niche: "Gaming" },
  { id: "ubWdv-g7lFw", niche: "Captions" },
  { id: "EF35L-XZ_Q4", niche: "Edits" },
  { id: "2u3xjS7M-Fo", niche: "Memes" },
];

function ytSrc(id: string) {
  // muted + autoplay + loop, all chrome hidden. disablekb + fs + iv_load_policy
  // kill the remaining overlays; the iframe is also pointer-events:none so the
  // big play/pause button never appears on hover.
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1&rel=0&showinfo=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0`;
}

function Card({ v }: { v: { id: string; niche: string } }) {
  return (
    <div className="group relative shrink-0">
      <div className="relative h-[300px] w-[169px] overflow-hidden rounded-2xl border border-white/10 bg-black md:h-[330px] md:w-[186px]">
        {/* The YouTube embed player is 16:9. To fill a 9:16 frame we make the
            iframe as tall as the frame and ~316% as wide (16/9 ÷ 9/16), then
            center it so the video covers the frame with no black bars. */}
        <iframe
          src={ytSrc(v.id)}
          title={v.niche}
          className="pointer-events-none absolute left-1/2 top-1/2 h-full -translate-x-1/2 -translate-y-1/2"
          style={{ width: "316%" }}
          allow="autoplay; encrypted-media"
          frameBorder={0}
          tabIndex={-1}
        />
        {/* overlay to fully block any residual YT UI / clicks */}
        <div className="absolute inset-0" />
      </div>
      <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
        {v.niche}
      </span>
    </div>
  );
}

export function LpNicheVideos() {
  // duplicate the list so the marquee loops seamlessly
  const row = [...VIDEOS, ...VIDEOS];
  return (
    <section className="px-4 md:px-8 pb-14">
      <div className="mx-auto max-w-[1320px]">
        <p className="mb-4 text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Real Shorts our users study — across every niche
        </p>

        {/* marquee: masked edges + continuous auto-scroll, pauses on hover */}
        <div
          className="group relative overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
          }}
        >
          <div className="flex w-max gap-3 lp-marquee group-hover:[animation-play-state:paused]">
            {row.map((v, i) => (
              <Card key={`${v.id}-${i}`} v={v} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
