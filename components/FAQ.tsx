"use client";

import { useState } from "react";
import { Reveal } from "./Reveal";

const FAQS = [
  {
    q: "What exactly does NicheSpy do?",
    a: "You type a niche, and NicheSpy automatically finds every relevant competitor channel, surfaces their outlier (over-performing) videos, spots content gaps nobody has covered, and alerts you when a competitor goes viral — all the research you'd normally do by hand, done in about a minute.",
  },
  {
    q: "Who is it for?",
    a: "Faceless and automation creators, small-to-mid channels in the 1k–100k subscriber range, and anyone starting a brand-new channel who needs to understand a niche fast. It's built primarily for the US and EU creator markets.",
  },
  {
    q: "How is this different from just using YouTube search?",
    a: "YouTube search shows you videos. NicheSpy gives you intelligence — it ranks competitors by health and activity, detects which videos beat a channel's own average, finds untouched topics, and monitors for traction in real time. It's the difference between browsing and analyzing.",
  },
  {
    q: "Do I need to connect my YouTube account?",
    a: "No. NicheSpy works on public competitor data, so you can research any niche without linking anything. (The upcoming Trust Score tool will optionally use deeper signals — more on that at launch.)",
  },
  {
    q: "What is the Trust Score tool?",
    a: "Trust Score is a coming-soon feature that gives any channel a 0–100 health score from real signals — engagement, retention, upload consistency, authority and growth velocity — so you can instantly tell genuinely strong channels from inflated ones.",
  },
  {
    q: "How much will it cost?",
    a: "Joining the waitlist is free and gets you early-access perks. Pricing will be announced before launch — waitlist members get the best deal.",
  },
  {
    q: "When does it launch?",
    a: "We're in active development and rolling out early access to the waitlist in batches. Join now to get in early and help shape the product.",
  },
];

function Item({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Reveal delay={Math.min(i, 4) * 0.05}>
      <div className="overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-lowest">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 px-7 py-6 text-left transition-colors hover:bg-surface-container-low"
        >
          <span className="text-title-medium">{q}</span>
          <span className={`shrink-0 text-[28px] font-light text-primary transition-transform duration-200 ${open ? "rotate-45" : ""}`}>+</span>
        </button>
        <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <p className="border-t border-outline-variant px-7 py-6 text-body-large text-on-surface-variant">{a}</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-[820px] px-5 md:px-8 py-24 md:py-28">
      <Reveal>
        <h2 className="mb-14 text-center text-display-small">
          Questions, <span className="text-primary">answered</span>
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
