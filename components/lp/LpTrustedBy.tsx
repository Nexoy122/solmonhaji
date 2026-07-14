import { Reveal } from "../Reveal";
import { LpShortsStrip } from "./LpShortsStrip";

// Social-proof strip: a scrolling row of real Shorts (center one plays, muted),
// then the niches our users win in.

// The niches our users win in (second row, chip style).
const NICHES = [
  "Faceless History",
  "AI Voiceover",
  "Reddit Stories",
  "Motivation",
  "Finance Shorts",
  "Gaming Clips",
  "Facts & Trivia",
  "Luxury / Cars",
  "Health & Fitness",
  "Tech Reviews",
];

export function LpTrustedBy() {
  return (
    <section className="pb-16 pt-2 md:pb-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <Reveal>
          <p className="text-center text-[13px] font-semibold uppercase tracking-[0.16em] text-white/35">
            Real Shorts our users study &amp; the niches they win in
          </p>
        </Reveal>

        {/* Row 1 — masonry of Shorts, all looping silently like GIFs */}
        <div className="mx-auto mt-10 max-w-[760px]">
          <LpShortsStrip />
        </div>

        {/* Row 2 — niche chips (marquee) */}
        <div className="relative mt-9 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)]">
          <div className="flex w-max animate-ticker gap-3.5">
            {[...NICHES, ...NICHES].map((n, i) => (
              <span
                key={`${n}-${i}`}
                className="whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-[14px] font-medium text-white/65"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
