"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BhLabel } from "./BhKit";

const FAQS = [
  { q: "What does NicheSpy actually do?", a: "You pick a niche, and NicheSpy finds the competitor channels, surfaces their outlier (over-performing) videos, spots content gaps nobody has covered, and turns winning ideas into ready-to-film scripts — the research you'd normally do by hand, in about a minute." },
  { q: "How is this different from YouTube search?", a: "YouTube search shows you videos. NicheSpy gives you intelligence — it ranks competitors by momentum, detects which videos beat a channel's own average, finds untouched topics, and scores channel health." },
  { q: "Do I need to connect my channel?", a: "Only for the Trust Score. Everything else works without connecting anything. When you do connect, it's read-only access to your analytics — nothing is posted or changed." },
  { q: "Is it built for Shorts?", a: "Yes. NicheSpy is tuned specifically for YouTube Shorts creators — outlier detection, retention scoring, and script generation are all built around the Shorts algorithm." },
  { q: "Can I cancel anytime?", a: "Yes. Plans are monthly and you can cancel or change tiers whenever you want — no lock-in, no contracts." },
];

export function BhFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-b-4 border-black bg-[#1040C0] bh-dots-light">
      <div className="mx-auto max-w-4xl px-4 py-14 md:px-8 md:py-24">
        <div className="text-center">
          <BhLabel className="text-white/70">// FAQ</BhLabel>
          <h2 className="mt-4 text-[clamp(32px,5vw,64px)] font-black uppercase leading-[0.9] tracking-tighter text-white">
            Questions?
          </h2>
        </div>

        <div className="mt-12 space-y-5">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#121212] md:border-4">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-200 ${isOpen ? "bg-[#D02020] text-white" : "bg-white text-black hover:bg-[#F0F0F0]"}`}
                >
                  <span className="text-[16px] font-black uppercase tracking-tight md:text-[18px]">{f.q}</span>
                  <ChevronDown className={`h-6 w-6 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} strokeWidth={3} />
                </button>
                {isOpen && (
                  <div className="border-t-4 border-black bg-[#FFF9C4] px-5 py-4 text-[15px] font-medium leading-relaxed text-black">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
