import { Quote } from "lucide-react";
import { BhLabel } from "./BhKit";

const REVIEWS = [
  { name: "Alex R.", handle: "@dailydose · 84K", quote: "Found 3 outlier formats in my niche in the first 10 minutes. Two became my best videos this month." },
  { name: "Priya K.", handle: "@financeshorts · 22K", quote: "The Trust Score told me exactly why retention was tanking. Fixed the hook, doubled my views." },
  { name: "Marcus T.", handle: "@historyfacts · 156K", quote: "Hours of spreadsheets replaced by about a minute of research. Genuinely a cheat code." },
  { name: "Sara L.", handle: "@animatedtales · 9K", quote: "The script generator writes hooks that actually stop the scroll. Like a viral editor on call." },
  { name: "Deniz A.", handle: "@gamingclipz · 47K", quote: "Discover shows me what's blowing up before everyone copies it. That head start is everything." },
  { name: "Chris M.", handle: "@motivate.daily · 203K", quote: "Every tool I need in one place, and it's fast. This replaced 4 subscriptions for me." },
];

const AV = ["#FF0033", "#1040C0", "#F0C020"];

export function BhReviews() {
  return (
    <section id="reviews" className="border-b-4 border-black bg-[#FF0033] bh-dots-light">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-24">
        <div className="max-w-2xl">
          <BhLabel className="text-white/70">Reviews</BhLabel>
          <h2 className="mt-4 text-[clamp(32px,5vw,64px)] font-black uppercase leading-[0.9] tracking-tighter text-white">
            Creators are winning with it
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <div key={r.handle} className="flex flex-col border-2 border-black bg-white p-6 shadow-[6px_6px_0px_0px_#121212] md:border-4">
              <Quote className="h-8 w-8 text-[#FF0033]" strokeWidth={2.5} fill="currentColor" />
              <p className="mt-4 flex-1 text-[15px] font-medium leading-relaxed text-black">{r.quote}</p>
              <div className="mt-6 flex items-center gap-3 border-t-2 border-black pt-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-black text-[16px] font-black text-white" style={{ background: AV[i % 3] }}>
                  {r.name.charAt(0)}
                </span>
                <div>
                  <div className="text-[14px] font-black uppercase tracking-tight text-black">{r.name}</div>
                  <div className="text-[12px] font-bold uppercase tracking-wide text-black/50">{r.handle}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
