"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Reveal } from "../Reveal";
import { MSym } from "../dashboard/NavIcons";
import { LpClickDemo, SCRIPT_DEMO, TRUST_DEMO, TRANSCRIPT_DEMO } from "./LpScriptDemo";
import { LpParallax } from "./LpScrollFx";

// vidIQ-style tool showcase: each live tool gets a big dashboard screenshot on
// one side and a punchy headline + one short line on the other. Rows alternate
// left/right down the page. Screenshots live in /public/lp-shots/<img>. Until a
// real PNG is dropped in, a labeled placeholder shows so the layout is complete.
type Tool = {
  eyebrow: string;
  name: string;
  tagline: string; // one short punchy line — no walls of text
  img: string; // e.g. "/lp-shots/discover.png"
  demo?: "script" | "trust" | "transcript"; // special interactive click→result demo instead of a static shot
};

const TOOLS: Tool[] = [
  {
    eyebrow: "RESEARCH",
    name: "Discover winning channels",
    tagline: "An auto-growing index of faceless Shorts channels — filter to the ones worth copying.",
    img: "/lp-shots/discover.png",
  },
  {
    eyebrow: "RESEARCH",
    name: "See every outlier video",
    tagline: "Every Short from the creators you track, sorted by exactly how hard it beat the average.",
    img: "/lp-shots/explore.png",
  },
  {
    eyebrow: "RESEARCH",
    name: "Map any niche in seconds",
    tagline: "Top channels, breakout topics, and the gaps nobody has covered yet — all in one view.",
    img: "/lp-shots/niche-researcher.png",
  },
  {
    eyebrow: "CREATE",
    name: "Scripts that hook, instantly",
    tagline: "Turn any topic or competitor video into a ready-to-film, hook-first Shorts script.",
    img: "/lp-shots/script-generator.png",
    demo: "script",
  },
  {
    eyebrow: "ANALYZE",
    name: "Score any channel 0–100",
    tagline: "Trust Score reads real signals so you can spot genuinely strong channels from inflated ones.",
    img: "/lp-shots/trust-score.png",
    demo: "trust",
  },
  {
    eyebrow: "ANALYZE",
    name: "Grab any Short's transcript",
    tagline: "Pull a clean, copy-ready transcript from any Short in seconds for research or repurposing.",
    img: "/lp-shots/shorts-transcript.png",
    demo: "transcript",
  },
  // More tools are added here as they ship — each just needs an eyebrow, a
  // punchy name, one short tagline, and a screenshot in /public/lp-shots/.
];

// Screenshot with a graceful fallback: if the PNG isn't there yet, show a
// labeled placeholder frame instead of a broken image.
// Coming-soon tools — mirrors the dimmed "Soon" items in the dashboard sidebar
// (same Material Symbol icons). Shown as a compact grid so the roadmap is visible
// without needing a screenshot for a tool that doesn't exist yet.
const SOON_TOOLS: { name: string; icon: string }[] = [
  { name: "Study Channels", icon: "travel_explore" },
  { name: "My Channels", icon: "subscriptions" },
  { name: "Voiceovers", icon: "record_voice_over" },
  { name: "Editor", icon: "movie_edit" },
  { name: "Clipper", icon: "content_cut" },
  { name: "Captions Generator", icon: "closed_caption" },
  { name: "Image Generator", icon: "image" },
  { name: "Channel Audit", icon: "fact_check" },
  { name: "Revenue Calculator", icon: "payments" },
  { name: "Video Downloader", icon: "download" },
  { name: "Video Upscaler", icon: "high_quality" },
  { name: "Background Remover", icon: "background_replace" },
];

// Animated pointer that drifts across the screenshot on a loop and pulses a
// "click" ripple at each stop — makes a static image feel like a live product.
// The path is varied by `seed` so adjacent shots don't move in lockstep.
function LiveCursor({ seed }: { seed: number }) {
  // three "stops" the cursor visits (percent of the frame), rotated by seed
  const stops = [
    [{ x: "28%", y: "40%" }, { x: "66%", y: "30%" }, { x: "48%", y: "68%" }],
    [{ x: "62%", y: "34%" }, { x: "34%", y: "62%" }, { x: "70%", y: "72%" }],
    [{ x: "40%", y: "66%" }, { x: "72%", y: "42%" }, { x: "30%", y: "36%" }],
  ][seed % 3];
  const xs = [stops[0].x, stops[1].x, stops[1].x, stops[2].x, stops[2].x, stops[0].x];
  const ys = [stops[0].y, stops[1].y, stops[1].y, stops[2].y, stops[2].y, stops[0].y];

  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-20"
      initial={{ left: stops[0].x, top: stops[0].y }}
      animate={{ left: xs, top: ys }}
      transition={{ duration: 9, ease: "easeInOut", times: [0, 0.25, 0.4, 0.6, 0.75, 1], repeat: Infinity, delay: seed * 0.7 }}
    >
      {/* click ripple — fires when the cursor is "resting" on a stop */}
      <motion.span
        className="absolute -left-3 -top-3 h-8 w-8 rounded-full border border-[#01D4FF]"
        animate={{ scale: [0.2, 1.4], opacity: [0.7, 0] }}
        transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 4.5 - (seed % 3) * 0.4, delay: 1.1 + seed * 0.7 }}
      />
      {/* the pointer */}
      <svg width="22" height="22" viewBox="0 0 24 24" className="drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)]" aria-hidden="true">
        <path d="M5 3l14 7-6 2-2 6z" fill="#fff" stroke="#0f1420" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}

function Shot({ src, label, index }: { src: string; label: string; index: number }) {
  const [ok, setOk] = useState(true);
  return (
    <div className="group relative">
      {/* ambient glow that intensifies on hover */}
      <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[32px] bg-[radial-gradient(60%_60%_at_50%_40%,rgba(1,212,255,0.16),transparent_70%)] opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#171d2b] shadow-[0_30px_80px_rgba(0,0,0,0.55)] transition-transform duration-500 group-hover:-translate-y-1.5">
        {/* faux browser chrome bar */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-white/40">
            <span className="h-1.5 w-1.5 rounded-full bg-[#28c840] animate-pulse-dot" /> app.vixo.live
          </span>
        </div>

        {ok ? (
          <div className="relative aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={label} className="block h-full w-full object-cover object-top" onError={() => setOk(false)} loading="lazy" />
            {/* soft diagonal sheen that sweeps once on hover */}
            <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent transition-transform duration-[1200ms] ease-out group-hover:translate-x-full" />
            <LiveCursor seed={index} />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-[#0FA5E9]/8 to-[#01D4FF]/4">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[#01D4FF]/30 bg-[#01D4FF]/10 text-[#01D4FF]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
              </div>
              <p className="text-[13px] font-semibold text-white/70">{label} screenshot</p>
              <p className="mt-1 text-[12px] text-white/35">drop {src} to replace</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LpToolShowcase() {
  return (
    <section id="tools" className="mx-auto max-w-[1320px] px-5 md:px-8 py-24 md:py-32">
      <Reveal>
        <span className="inline-flex items-center rounded-full border border-[#01D4FF]/30 bg-[#01D4FF]/10 px-4 py-1.5 text-[13px] font-bold text-[#01D4FF]">
          {TOOLS.length} TOOLS · MORE ON THE WAY
        </span>
        <h2 className="font-heading mt-6 text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.01em] text-white max-w-[820px]">
          Everything you need to{" "}
          <span className="bg-gradient-to-r from-[#0FA5E9] to-[#01D4FF] bg-clip-text text-transparent">research, create, and analyze</span>
        </h2>
      </Reveal>

      <div className="mt-20 flex flex-col gap-24 md:gap-28">
        {TOOLS.map((tool, i) => {
          const reverse = i % 2 === 1;
          return (
            <div key={tool.name} className="grid grid-cols-1 items-center gap-8 md:grid-cols-[0.82fr_1.18fr] md:gap-14">
              {/* Copy — deliberately short */}
              <Reveal className={reverse ? "md:order-2" : ""}>
                <div>
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-white/60">
                    {tool.eyebrow}
                  </span>
                  <h3 className="font-heading mt-4 text-[clamp(24px,3vw,34px)] font-bold leading-tight text-white max-w-[420px]">
                    {tool.name}
                  </h3>
                  <p className="mt-4 text-[17px] leading-relaxed text-white/60 max-w-[440px]">
                    {tool.tagline}
                  </p>
                </div>
              </Reveal>

              {/* Screenshot — or the interactive click→result demo. Wrapped in
                  parallax so it drifts slightly as the row scrolls through view. */}
              <Reveal delay={0.1} className={reverse ? "md:order-1" : ""}>
                <LpParallax amount={34}>
                  {tool.demo === "script" ? (
                    <LpClickDemo config={SCRIPT_DEMO} />
                  ) : tool.demo === "trust" ? (
                    <LpClickDemo config={TRUST_DEMO} />
                  ) : tool.demo === "transcript" ? (
                    <LpClickDemo config={TRANSCRIPT_DEMO} />
                  ) : (
                    <Shot src={tool.img} label={tool.name} index={i} />
                  )}
                </LpParallax>
              </Reveal>
            </div>
          );
        })}
      </div>

      {/* ── Coming soon ─────────────────────────────────────────────────────
          The roadmap: tools that are in the dashboard but not live yet. */}
      <div className="mt-28 md:mt-32">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[13px] font-bold text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-[#01D4FF] animate-pulse-dot" />
              COMING SOON
            </span>
            <h3 className="font-heading mt-5 text-[clamp(24px,3vw,36px)] font-bold tracking-[-0.01em] text-white">
              And {SOON_TOOLS.length} more tools on the way
            </h3>
            <p className="mx-auto mt-4 max-w-[540px] text-[16px] leading-relaxed text-white/55">
              Voiceovers, an editor, a clipper, and more — everything a faceless creator needs,
              rolling out to beta users first.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SOON_TOOLS.map((t, i) => (
            <Reveal key={t.name} delay={Math.min(i, 8) * 0.04}>
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 transition-colors hover:border-white/15">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-white/45">
                  <MSym name={t.icon} size={22} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-white/75">{t.name}</span>
                <span className="shrink-0 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/40">
                  Soon
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
