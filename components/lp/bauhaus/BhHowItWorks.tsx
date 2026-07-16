import { Search, Zap, PenLine } from "lucide-react";
import { BhLabel } from "./BhKit";

const STEPS = [
  {
    n: "01",
    icon: Search,
    color: "#FF0033",
    title: "Pick your niche",
    desc: "Type it or choose one. We pull the channels posting Shorts in that space right now.",
  },
  {
    n: "02",
    icon: Zap,
    color: "#1040C0",
    title: "See the outliers",
    desc: "We surface the Shorts beating their channel's average 10–100×, and break down why they popped.",
  },
  {
    n: "03",
    icon: PenLine,
    color: "#F0C020",
    title: "Ship your version",
    desc: "Turn a winning format into a hook-first script you can film today. Not a copy, your angle.",
  },
];

export function BhHowItWorks() {
  return (
    <section id="how" className="border-b-4 bh-border bh-bg">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-24">
        <div className="max-w-2xl">
          <BhLabel className="text-[#1040C0]">How it works</BhLabel>
          <h2 className="mt-4 text-[clamp(32px,5vw,64px)] font-black uppercase leading-[0.9] tracking-tighter bh-text">
            Niche in.<br />Next upload out.
          </h2>
          <p className="mt-5 text-[17px] font-medium opacity-70 bh-text md:text-[18px]">
            Three steps, about a minute, instead of an evening lost in tabs and spreadsheets.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="relative border-2 bh-border bh-surface bh-sh-6 p-7 md:border-4">
                {/* big step number, watermark style */}
                <span
                  className="pointer-events-none absolute right-4 top-2 text-[64px] font-black leading-none opacity-10 bh-text"
                  aria-hidden
                >
                  {s.n}
                </span>
                <span
                  className="flex h-14 w-14 items-center justify-center border-2 bh-border text-white bh-sh-3"
                  style={{ background: s.color }}
                >
                  <Icon className={`h-7 w-7 ${s.color === "#F0C020" ? "text-black" : ""}`} strokeWidth={2.5} />
                </span>
                <h3 className="mt-5 text-[21px] font-black uppercase tracking-tight bh-text">{s.title}</h3>
                <p className="mt-2 text-[15px] font-medium leading-relaxed opacity-70 bh-text">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
