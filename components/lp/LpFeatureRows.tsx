"use client";

import { motion } from "framer-motion";
import { Reveal } from "../Reveal";

type Row = {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: React.ReactNode;
};

const cardCls = "rounded-2xl border border-white/[0.08] bg-[#171d2b] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]";

function CompetitorPanel() {
  const rows = [
    { h: "@historydaily", v: "2.4M", x: "8.1×", up: true },
    { h: "@ai.voiceover", v: "891K", x: "3.2×", up: true },
    { h: "@reddit.reads", v: "310K", x: "0.7×", up: false },
    { h: "@factvault", v: "1.2M", x: "4.6×", up: true },
  ];
  return (
    <div className={cardCls}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[16px] font-semibold text-white">Outliers this week</span>
        <span className="rounded-full bg-[#01D4FF]/15 px-3 py-1 text-[12px] font-bold text-[#01D4FF]">LIVE</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.h} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3 text-[15px]">
            <span className="font-medium text-white/90">{r.h}</span>
            <span className="flex items-center gap-3">
              <span className="text-white/50">{r.v}</span>
              <span className={`rounded-md px-2 py-0.5 text-[13px] font-bold ${r.up ? "bg-[#34d399]/15 text-[#34d399]" : "bg-[#ff6b6b]/15 text-[#ff6b6b]"}`}>
                {r.x}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GapPanel() {
  const gaps = [
    { t: "\"Ancient tech that shouldn't exist\"", d: "0 competitors · rising" },
    { t: "\"Billionaire morning routines\"", d: "2 competitors · trending" },
    { t: "\"Deep-sea creatures explained\"", d: "0 competitors · untapped" },
  ];
  return (
    <div className={cardCls}>
      <div className="mb-4 text-[16px] font-semibold text-white">Topic gaps in your niche</div>
      <div className="flex flex-col gap-3">
        {gaps.map((g) => (
          <div key={g.t} className="rounded-xl bg-white/[0.03] px-4 py-3">
            <div className="text-[15px] font-medium text-white/90">{g.t}</div>
            <div className="mt-1 text-[13px] font-semibold text-[#01D4FF]">{g.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScriptPanel() {
  return (
    <div className={cardCls}>
      <div className="mb-4 flex items-center gap-2 text-[16px] font-semibold text-white">
        <span className="h-2.5 w-2.5 rounded-full bg-[#01D4FF] animate-pulse-dot" />
        AI script generator
      </div>
      <div className="space-y-2.5 text-[14px] leading-relaxed text-white/55">
        <p><span className="font-bold text-white">Hook:</span> &ldquo;This 2,000-year-old device still baffles engineers…&rdquo;</p>
        <p><span className="font-bold text-white">Beat 1:</span> Reveal the object. Tight zoom, no fluff.</p>
        <p><span className="font-bold text-white">Beat 2:</span> The one detail nobody explains.</p>
        <div className="h-2 w-2/3 rounded bg-white/10" />
        <div className="h-2 w-1/2 rounded bg-white/10" />
      </div>
    </div>
  );
}

const ROWS: Row[] = [
  {
    eyebrow: "COMPETITOR INTELLIGENCE",
    title: "See exactly what's working, before you hit record",
    body: "Type any niche and NicheSpy surfaces every competitor and the outlier videos crushing their average. No more guessing which formats the algorithm rewards.",
    bullets: [
      "Every competitor channel, ranked by momentum",
      "Outlier videos scored by how far they beat the baseline",
      "Views, velocity, and posting cadence at a glance",
    ],
    visual: <CompetitorPanel />,
  },
  {
    eyebrow: "UNTAPPED TOPICS",
    title: "Find the videos nobody in your niche has made yet",
    body: "Gap Finder reveals trending topics with little or no competition. Make that video first and you're playing on an empty field instead of fighting for scraps.",
    bullets: [
      "Rising topics with 0–2 competitors",
      "First-mover ideas surfaced daily",
      "Filter by niche, format, and language",
    ],
    visual: <GapPanel />,
  },
  {
    eyebrow: "AI THAT DOES THE WORK",
    title: "Turn any winning idea into a ready-to-film script",
    body: "Feed NicheSpy a topic or a competitor's video and get a hook-first Shorts script back in seconds, structured the way outliers in your niche are actually built.",
    bullets: [
      "Hook-first scripts modeled on proven outliers",
      "Generate straight from a competitor's video",
      "Pull clean transcripts for any Short",
    ],
    visual: <ScriptPanel />,
  },
];

const bulletFade = {
  hidden: { opacity: 0, x: -10 },
  show: (i: number) => ({ opacity: 1, x: 0, transition: { delay: 0.1 + i * 0.08, duration: 0.45 } }),
};

export function LpFeatureRows() {
  return (
    <section id="features" className="mx-auto max-w-[1180px] px-5 md:px-8 py-24 md:py-32">
      <Reveal>
        <h2 className="font-heading text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.01em] text-white max-w-[840px]">
          Everything you need to grow ,{" "}
          <span className="bg-gradient-to-r from-[#0FA5E9] to-[#01D4FF] bg-clip-text text-transparent">without the spreadsheet grind</span>
        </h2>
      </Reveal>

      <div className="mt-20 flex flex-col gap-24 md:gap-32">
        {ROWS.map((row, i) => {
          const reverse = i % 2 === 1;
          return (
            <div key={row.title} className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
              <Reveal className={reverse ? "md:order-2" : ""}>
                <div>
                  <span className="inline-flex items-center rounded-full border border-[#01D4FF]/30 bg-[#01D4FF]/10 px-3.5 py-1.5 text-[12px] font-bold tracking-wide text-[#01D4FF]">
                    {row.eyebrow}
                  </span>
                  <h3 className="font-heading mt-5 text-[clamp(24px,3vw,34px)] font-bold leading-tight text-white max-w-[460px]">{row.title}</h3>
                  <p className="mt-5 text-[17px] leading-relaxed text-white/60 max-w-[480px]">{row.body}</p>
                  <ul className="mt-7 flex flex-col gap-3.5">
                    {row.bullets.map((b, bi) => (
                      <motion.li
                        key={b}
                        custom={bi}
                        variants={bulletFade}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.6 }}
                        className="flex items-start gap-3 text-[16px] text-white/85"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0FA5E9] text-white">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        </span>
                        {b}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={0.1} className={reverse ? "md:order-1" : ""}>
                {row.visual}
              </Reveal>
            </div>
          );
        })}
      </div>
    </section>
  );
}
