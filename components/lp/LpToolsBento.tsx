"use client";

import { useState } from "react";
import { Reveal } from "../Reveal";
import { MSym } from "../dashboard/NavIcons";
import { LpClickDemo, SCRIPT_DEMO, TRUST_DEMO, TRANSCRIPT_DEMO } from "./LpScriptDemo";

// Bento-style tools grid: each card has a compact preview panel on top and an
// icon + name + one line below. Cards vary in width — wide cards span 4 of 6
// columns, normal cards span 2. Three live tools have a before→click→after demo
// (LpClickDemo, chrome-less inside the card); the rest show a screenshot from
// /public/lp-shots (icon-panel fallback if the PNG is missing). "Soon" tools are
// included too, as compact icon cards with a Soon badge.
type Tool = {
  name: string;
  icon: string;
  desc: string;
  img?: string; // /lp-shots/<name>.png — omit to show an icon panel
  demo?: "script" | "trust" | "transcript"; // live before→after click demo
  span: 2 | 3 | 4; // columns out of a 6-col grid
  soon?: boolean;
};

// Live tools — a fully-balanced bento: three rows of two equal 3-col cards, so
// every row fills the whole 6-col width with no empty gap. Paired cards share a
// width → same preview height → the cards line up cleanly with no dead space.
const TOOLS: Tool[] = [
  {
    name: "Discover Winning Channels",
    icon: "travel_explore",
    desc: "An auto-growing index of faceless Shorts channels — filter by niche, subs, views, and momentum to find creators worth studying.",
    img: "/lp-shots/discover.png",
    span: 3,
  },
  {
    name: "Find Viral Outliers",
    icon: "trending_up",
    desc: "Every Short from the creators you track, sorted by exactly how hard it beat the average — see the exact videos winning right now.",
    img: "/lp-shots/explore.png",
    span: 3,
  },
  {
    name: "Map Any Niche",
    icon: "hub",
    desc: "Top channels, breakout topics, and the untapped gaps nobody has covered yet — map a whole niche end to end.",
    img: "/lp-shots/niche-researcher.png",
    span: 3,
  },
  {
    name: "Write Scripts",
    icon: "description",
    desc: "Generate a hook-first Shorts script from a topic or straight from a competitor's video.",
    demo: "script",
    span: 3,
  },
  {
    name: "Grab Transcripts",
    icon: "article",
    desc: "Pull a clean, copy-ready transcript from any Short in seconds — for research, scripting, or repurposing.",
    demo: "transcript",
    span: 3,
  },
  {
    name: "Score Any Channel 0–100",
    icon: "verified",
    desc: "Trust Score reads real signals — engagement, retention, consistency, authority, growth — so you can tell genuinely strong channels from inflated ones.",
    demo: "trust",
    span: 3,
  },
];

// Roadmap tools — in the dashboard but not live yet. Shown as compact icon cards
// (span 2 each = three per row) with a Soon badge.
const SOON_TOOLS: Tool[] = [
  { name: "Study Channels", icon: "travel_explore", desc: "Deep-dive any channel's full upload history and patterns.", span: 2, soon: true },
  { name: "My Channels", icon: "subscriptions", desc: "Track your own channels' growth alongside competitors.", span: 2, soon: true },
  { name: "Voiceovers", icon: "record_voice_over", desc: "Turn a script into a natural AI voiceover in one click.", span: 2, soon: true },
  { name: "Editor", icon: "movie_edit", desc: "Assemble and edit Shorts without leaving the app.", span: 2, soon: true },
  { name: "Clipper", icon: "content_cut", desc: "Auto-clip long videos into viral Shorts and TikToks.", span: 2, soon: true },
  { name: "Captions Generator", icon: "closed_caption", desc: "Add styled, word-by-word captions automatically.", span: 2, soon: true },
  { name: "Image Generator", icon: "image", desc: "Generate thumbnails and B-roll images from a prompt.", span: 2, soon: true },
  { name: "Channel Audit", icon: "fact_check", desc: "A full performance breakdown of any channel's strengths and gaps.", span: 2, soon: true },
  { name: "Revenue Calculator", icon: "payments", desc: "Estimate a channel's earnings from views and niche RPM.", span: 2, soon: true },
  { name: "Video Downloader", icon: "download", desc: "Grab any Short or video for research and repurposing.", span: 2, soon: true },
  { name: "Video Upscaler", icon: "high_quality", desc: "Upscale low-res clips to crisp HD before publishing.", span: 2, soon: true },
  { name: "Background Remover", icon: "background_replace", desc: "Cut out backgrounds for clean overlays in seconds.", span: 2, soon: true },
];

const SPAN_CLASS: Record<NonNullable<Tool["span"]>, string> = {
  2: "md:col-span-2 h-full",
  3: "md:col-span-3 h-full",
  4: "md:col-span-4 h-full",
};

const DEMO_CONFIG = {
  script: SCRIPT_DEMO,
  trust: TRUST_DEMO,
  transcript: TRANSCRIPT_DEMO,
} as const;

// Dark icon chip: white glyph, dark box, no glow / no shadow.
function IconChip({ icon, size = 18, box = "h-8 w-8" }: { icon: string; size?: number; box?: string }) {
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0f1420] text-white`}>
      <MSym name={icon} size={size} />
    </span>
  );
}

// Static screenshot preview (with a graceful icon fallback) or an icon panel.
function StaticPreview({ tool }: { tool: Tool }) {
  const [ok, setOk] = useState(Boolean(tool.img));

  if (tool.img && ok) {
    return (
      <div className="relative aspect-[16/9] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tool.img}
          alt={tool.name}
          loading="lazy"
          onError={() => setOk(false)}
          className="block h-full w-full object-cover object-top transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#141a27] to-transparent" />
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-[1100ms] ease-out group-hover:translate-x-full" />
      </div>
    );
  }

  return (
    <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-[#10151f]">
      <IconChip icon={tool.icon} size={28} box="h-14 w-14" />
    </div>
  );
}

// Card meta: the icon + name + one line under the preview.
function CardMeta({ tool }: { tool: Tool }) {
  return (
    <div className="flex flex-1 flex-col px-5 pb-6 pt-3">
      <div className="flex items-center gap-2.5">
        <IconChip icon={tool.icon} />
        <h3 className="font-heading text-[17px] font-bold text-white">{tool.name}</h3>
        {tool.soon && (
          <span className="ml-auto shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/45">
            Soon
          </span>
        )}
      </div>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/55">{tool.desc}</p>
    </div>
  );
}

function BentoCard({ tool }: { tool: Tool }) {
  return (
    <div
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141a27] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] ${
        tool.soon ? "opacity-90" : ""
      }`}
    >
      {tool.demo ? (
        // Live before→click→after demo, chrome-less and frame-less so it sits
        // flush at the top of the bento card.
        <LpClickDemo config={DEMO_CONFIG[tool.demo]} chrome={false} bare />
      ) : (
        <StaticPreview tool={tool} />
      )}
      <CardMeta tool={tool} />
    </div>
  );
}

export function LpToolsBento() {
  return (
    <section id="tools" className="mx-auto max-w-[1120px] px-5 md:px-8 py-24 md:py-32">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[13px] font-bold text-white/70">
            {TOOLS.length + SOON_TOOLS.length} TOOLS · {TOOLS.length} LIVE NOW
          </span>
          <h2 className="font-heading mx-auto mt-6 max-w-[820px] text-[clamp(30px,4.2vw,48px)] font-bold tracking-[-0.01em] text-white">
            One app to{" "}
            <span className="bg-gradient-to-r from-[#0FA5E9] to-[#01D4FF] bg-clip-text text-transparent">
              research, create &amp; analyze
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-[600px] text-[17px] leading-relaxed text-white/60">
            One workspace for the whole faceless-creator workflow — from finding competitors to
            shipping the script. Everything that&apos;s live today, plus what&apos;s next.
          </p>
        </div>
      </Reveal>

      {/* Live tools */}
      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-6">
        {TOOLS.map((tool, i) => (
          <Reveal key={tool.name} delay={Math.min(i, 5) * 0.06} className={SPAN_CLASS[tool.span]}>
            <BentoCard tool={tool} />
          </Reveal>
        ))}
      </div>

      {/* Coming soon */}
      <Reveal>
        <div className="mt-20 flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-pulse-dot" />
            Coming soon
          </span>
          <span className="h-px flex-1 bg-white/[0.06]" />
        </div>
      </Reveal>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-6">
        {SOON_TOOLS.map((tool, i) => (
          <Reveal key={tool.name} delay={Math.min(i, 6) * 0.04} className={SPAN_CLASS[tool.span]}>
            <BentoCard tool={tool} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
