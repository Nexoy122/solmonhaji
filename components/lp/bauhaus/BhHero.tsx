import { ArrowRight, Play } from "lucide-react";
import { BhButton, BhLabel, BhShortCard } from "./BhKit";

// The Shorts shown in the hero deck. Same mockup as before, the flat color
// fields are now real footage from the niches we analyze.
const DECK = [
  { bg: "#1040C0", video: "/niches/edits.mp4", poster: "/niches/edits.jpg", title: "I tried the 3AM productivity routine", channel: "@dailygrind", viewCount: 12_400_000, outlier: "47× outlier", rotate: -5 },
  { bg: "#FF0033", video: "/niches/memes.mp4", poster: "/niches/memes.jpg", title: "This ONE editing trick doubled my views", channel: "@cutfast", viewCount: 4_200_000, outlier: "12× outlier", rotate: 3 },
  { bg: "#F0C020", video: "/niches/gaming.mp4", poster: "/niches/gaming.jpg", title: "Reddit stories that broke the algorithm", channel: "@storyloop", viewCount: 890_000, outlier: "8× outlier", rotate: -2 },
];

export function BhHero() {
  return (
    <section id="top" className="border-b-4 bh-border bh-bg">
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        {/* left, copy */}
        <div className="relative flex flex-col justify-center border-b-4 bh-border px-4 py-14 md:px-8 md:py-20 lg:border-b-0 lg:border-r-4">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF0033]">
              <Play className="ml-[1px] h-2.5 w-2.5 fill-white text-white" />
            </span>
            <BhLabel className="text-[#FF0033]">For YouTube Shorts creators</BhLabel>
          </div>

          <h1 className="mt-5 text-[clamp(38px,7vw,78px)] font-black uppercase leading-[0.88] tracking-tighter bh-text">
            Spy on<br />what<br />
            <span className="relative inline-block">
              <span className="relative z-10 px-2 text-white">actually</span>
              <span className="absolute inset-0 -rotate-1 bg-[#FF0033]" />
            </span>
            <br />works
          </h1>

          <p className="mt-7 max-w-md text-[17px] font-medium leading-relaxed opacity-80 bh-text md:text-[18px]">
            Find the Shorts pulling 10–100× a channel&apos;s average, break down why they
            popped, and turn them into your next script, in a minute, not an evening.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <BhButton href="/signup" color="red">
              Start free <ArrowRight className="h-5 w-5" strokeWidth={3} />
            </BhButton>
            <BhButton href="#tools" color="outline">See the tools</BhButton>
          </div>

          <p className="mt-5 text-[13.5px] font-bold uppercase tracking-wide opacity-50 bh-text">
            100 free credits · No card required
          </p>
        </div>

        {/* right, the outlier feed: a fanned deck of Shorts */}
        <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-[#0F0F0F] bh-dots-light px-6 py-14 lg:min-h-[600px]">
          {/* faux "outliers found" toolbar, sells that this is a product */}
          <div className="absolute left-1/2 top-6 z-20 flex -translate-x-1/2 items-center gap-2 border-2 border-black bg-[#F0C020] px-3 py-1.5 shadow-[3px_3px_0_0_#000]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF0033]" />
            <span className="text-[12px] font-black uppercase tracking-wide text-black">
              3 outliers found in Productivity
            </span>
          </div>

          <div className="flex w-full max-w-[440px] items-center justify-center gap-3 sm:gap-4">
            {DECK.map((s, i) => (
              <div key={s.channel} className={i === 1 ? "w-[36%] -translate-y-4" : "w-[32%]"}>
                <BhShortCard {...s} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
