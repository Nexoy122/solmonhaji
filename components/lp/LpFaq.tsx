"use client";

import { useState } from "react";
import { Reveal } from "../Reveal";

const FAQS = [
  {
    q: "What exactly does NicheSpy do?",
    a: "You pick a niche, and NicheSpy automatically finds every relevant competitor channel, surfaces their outlier (over-performing) videos, spots content gaps nobody has covered, and turns winning ideas into ready-to-film scripts, all the research you'd normally do by hand, done in about a minute.",
  },
  {
    q: "Who is it for?",
    a: "Faceless and automation creators, small-to-mid channels in the 1k–100k subscriber range, and anyone starting a brand-new channel who needs to understand a niche fast. It's built primarily for the US and EU creator markets.",
  },
  {
    q: "How is this different from just using YouTube search?",
    a: "YouTube search shows you videos. NicheSpy gives you intelligence, it ranks competitors by momentum, detects which videos beat a channel's own average, finds untouched topics, and scores channel health. It's the difference between browsing and analyzing.",
  },
  {
    q: "Which tools are live right now?",
    a: "Discover, Explore, and Niche Researcher for research; Script Generator for creating; and Trust Score, Channel Audit, and Shorts Transcript for analysis. More tools (voiceovers, editor, clipper, and more) are on the way.",
  },
  {
    q: "Do I need to connect my YouTube account?",
    a: "No. NicheSpy works on public competitor data, so you can research any niche without linking anything. Connecting your channel is optional and unlocks personalized analysis.",
  },
  {
    q: "How much does it cost?",
    a: "Sign up is free, and beta users get Creator-tier tools unlocked at no cost during early access, plus 50% off for life when paid plans launch. No credit card required to start.",
  },
];

function Item({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Reveal delay={Math.min(i, 4) * 0.05}>
      <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#171d2b]">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 px-7 py-6 text-left transition-colors hover:bg-white/[0.02]"
        >
          <span className="text-[18px] font-semibold text-white">{q}</span>
          <span className={`shrink-0 text-[28px] font-light text-[#01D4FF] transition-transform duration-200 ${open ? "rotate-45" : ""}`}>+</span>
        </button>
        <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <p className="border-t border-white/[0.08] px-7 py-6 text-[16px] leading-relaxed text-white/60">{a}</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export function LpFaq() {
  return (
    <section id="faq" className="mx-auto max-w-[820px] px-5 md:px-8 py-24 md:py-28">
      <Reveal>
        <h2 className="font-heading mb-14 text-center text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.01em] text-white">
          Questions,{" "}
          <span className="bg-gradient-to-r from-[#0FA5E9] to-[#01D4FF] bg-clip-text text-transparent">answered</span>
        </h2>
      </Reveal>
      <div className="flex flex-col gap-3.5">
        {FAQS.map((f, i) => (
          <Item key={f.q} q={f.q} a={f.a} i={i} />
        ))}
      </div>
    </section>
  );
}
