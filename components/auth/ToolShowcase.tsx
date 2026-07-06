"use client";

import { useState, useEffect } from "react";
import { TOOL_GRAPHICS } from "@/components/auth/ToolGraphics";

// Each tool = a hero "poster" (title + subtitle + a cyan-tinted concentric
// visual). The panel auto-cycles; the bottom tab strip lets you jump between
// them — modeled on the AUTO CLIP reference.
const TOOLS = [
  {
    id: "explore",
    tab: "EXPLORE",
    title: "EXPLORE",
    tagline: "Every winning channel, one search away.",
    desc: "Browse an auto-growing index of blowing-up Shorts channels by niche, format and velocity. Search any vibe and pull up the creators crushing it right now.",
  },
  {
    id: "trust",
    tab: "TRUST",
    title: "TRUST SCORE",
    tagline: "Know if a channel is worth chasing — instantly.",
    desc: "Get a 0–100 health score for any channel: growth, consistency, engagement and red flags, analyzed in seconds. Stop guessing who's actually winning.",
  },
  {
    id: "niche",
    tab: "NICHE",
    title: "NICHE RESEARCHER",
    tagline: "See exactly what's blowing up this week.",
    desc: "Auto-tracked channels, viral outliers and AI-written recaps for every niche — updated daily. Spot the wave before everyone else rides it.",
  },
  {
    id: "script",
    tab: "SCRIPT",
    title: "SCRIPT GENERATOR",
    tagline: "From blank page to viral hook in seconds.",
    desc: "Drop a topic and get a scroll-stopping Shorts script — punchy hook, retention beats and a CTA that converts. Write a week of content in minutes.",
  },
  {
    id: "audit",
    tab: "AUDIT",
    title: "CHANNEL AUDIT",
    tagline: "A full teardown of any channel's playbook.",
    desc: "Hooks, editing, voiceover, music and captions — a deep AI audit of what a channel does right and where it leaks views. Reverse-engineer the winners.",
  },
  {
    id: "transcript",
    tab: "TRANSCRIPT",
    title: "SHORTS TRANSCRIPT",
    tagline: "Rip the words out of any Short instantly.",
    desc: "Paste any YouTube Shorts link and get its full transcript in seconds — even Hinglish, cleaned and ready to study, remix or repurpose.",
  },
] as const;

const CYCLE_MS = 3800;

export function ToolShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Re-arm a single timer on every tool change so the progress bar (keyed on
  // `active`) and the auto-advance stay perfectly in step — no drift.
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setActive((i) => (i + 1) % TOOLS.length), CYCLE_MS);
    return () => clearTimeout(t);
  }, [active, paused]);

  const tool = TOOLS[active];
  const Graphic = TOOL_GRAPHICS[tool.id];

  return (
    <div
      className="relative flex h-full min-h-[560px] flex-col overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ background: "linear-gradient(160deg, #101018 0%, #0A0A0E 60%, #08080B 100%)" }}
    >
      {/* Vertical grille bars */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "46px 100%",
          maskImage: "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.3) 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.3) 70%, transparent 100%)",
        }}
      />

      {/* Per-tool motion graphic — re-keys on tool change to replay the animation */}
      <div key={tool.id} className="showcase-scene pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="absolute size-56 rounded-full bg-[#0FA5E9]/[0.12] blur-[70px]" />
        <div className="relative h-[320px] w-[320px] max-xl:h-[260px] max-xl:w-[260px]">
          <Graphic />
        </div>
      </div>

      {/* brand mark top-left */}
      <div className="relative z-10 flex items-center gap-2.5 p-6 font-heading text-[19px] font-bold text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.webp" alt="" width={30} height={30} className="rounded-lg" />
        NicheSpy
      </div>

      {/* Title block (bottom-left) */}
      <div className="relative z-10 mt-auto max-w-[440px] px-7 pb-5">
        <span key={`k-${tool.id}`} className="showcase-fade inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-[#4fc3f7]">
          NicheSpy Tool
        </span>
        <h2 key={`t-${tool.id}`} className="showcase-fade mt-2 font-heading text-[40px] font-bold uppercase leading-none tracking-[-0.01em] text-white max-xl:text-[32px]" style={{ animationDelay: "0.05s" }}>
          {tool.title}
        </h2>
        <p key={`g-${tool.id}`} className="showcase-fade mt-3 text-[15px] font-semibold text-white" style={{ animationDelay: "0.1s" }}>
          {tool.tagline}
        </p>
        <p key={`d-${tool.id}`} className="showcase-fade mt-1.5 text-[13.5px] leading-relaxed text-[#9AA1AD]" style={{ animationDelay: "0.16s" }}>
          {tool.desc}
        </p>
      </div>

      {/* Tab strip */}
      <div className="relative z-10 border-t border-white/[0.07] px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          {TOOLS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActive(i)}
              className={`whitespace-nowrap text-[10.5px] font-bold tracking-[0.04em] transition-colors ${
                i === active ? "text-white" : "text-[#5B6270] hover:text-[#9AA1AD]"
              }`}
            >
              {t.tab}
            </button>
          ))}
        </div>
        {/* progress track — keyed on `active` so it restarts in lockstep with
            the auto-advance timer (paused freezes it) */}
        <div className="relative mt-3 h-[2px] w-full bg-white/[0.08]">
          <div
            key={`${active}-${paused}`}
            className="absolute inset-y-0 left-0 bg-[#0FA5E9]"
            style={{ animation: paused ? "none" : `showcase-progress ${CYCLE_MS}ms linear forwards`, width: paused ? "35%" : undefined }}
          />
        </div>
      </div>
    </div>
  );
}
