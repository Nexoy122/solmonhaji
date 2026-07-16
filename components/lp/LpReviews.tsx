import { Reveal } from "../Reveal";

// Testimonials / reviews. Placeholder content, swap names/quotes/avatars for
// real ones later. No real images (initials avatars).
type Review = { name: string; handle: string; quote: string; subs: string };

const REVIEWS: Review[] = [
  { name: "Alex R.", handle: "@dailydose", subs: "84K subs", quote: "Found 3 outlier formats in my niche in the first 10 minutes. Two of them became my best videos this month." },
  { name: "Priya K.", handle: "@financeshorts", subs: "22K subs", quote: "The Trust Score told me exactly why my retention was tanking. Fixed the hook and my views doubled." },
  { name: "Marcus T.", handle: "@historyfacts", subs: "156K subs", quote: "I used to spend hours in spreadsheets. Now I get the same research in about a minute. Genuinely a cheat code." },
  { name: "Sara L.", handle: "@animatedtales", subs: "9K subs", quote: "The script generator writes hooks that actually stop the scroll. It's like having a viral editor on call." },
  { name: "Deniz A.", handle: "@gamingclipz", subs: "47K subs", quote: "Discover shows me what's blowing up in my niche before everyone copies it. That head start is everything." },
  { name: "Chris M.", handle: "@motivate.daily", subs: "203K subs", quote: "Every tool I actually need in one place, and it's fast. This replaced 4 subscriptions for me." },
];

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0FA5E9] to-[#8b5cff] text-[15px] font-bold text-white">
      {name.charAt(0)}
    </span>
  );
}

function Stars() {
  return (
    <div className="flex gap-0.5 text-[#f5b942]">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
      ))}
    </div>
  );
}

export function LpReviews() {
  return (
    <section id="reviews" className="px-5 md:px-8 py-24">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[13px] font-semibold uppercase tracking-[0.15em] text-[#01D4FF]">Reviews</span>
            <h2 className="font-heading mt-3 text-[clamp(30px,4.4vw,46px)] font-extrabold tracking-tight text-white">
              Creators are already winning with it
            </h2>
            <p className="mt-4 text-[17px] text-white/55">Real results from faceless creators using NicheSpy every day.</p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <Reveal key={r.handle} delay={i * 0.05}>
              <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <Stars />
                <p className="mt-4 flex-1 text-[15px] leading-relaxed text-white/80">&ldquo;{r.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-4">
                  <Avatar name={r.name} />
                  <div>
                    <div className="text-[14px] font-bold text-white">{r.name}</div>
                    <div className="text-[12px] text-white/45">{r.handle} · {r.subs}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
