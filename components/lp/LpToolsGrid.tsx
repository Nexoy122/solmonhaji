import { Reveal } from "../Reveal";
import { MSym } from "../dashboard/NavIcons";

// The tools that actually exist in the dashboard today, grouped like the sidebar
// (Research / Create / Analyze). New tools get added here as they ship.
type Tool = { name: string; icon: string; desc: string };
type Group = { heading: string; blurb: string; tools: Tool[] };

const GROUPS: Group[] = [
  {
    heading: "Research",
    blurb: "Find who you're up against and what's winning.",
    tools: [
      { name: "Discover", icon: "explore", desc: "An auto-growing index of faceless Shorts channels, filter by niche, subs, views, and momentum to find creators worth studying." },
      { name: "Explore", icon: "search", desc: "Every Short from the creators you track, sortable by outlier multiple and velocity. See the exact videos beating the baseline right now." },
      { name: "Niche Researcher", icon: "query_stats", desc: "Map a niche end-to-end: top channels, breakout topics, and the untapped gaps nobody has covered yet." },
    ],
  },
  {
    heading: "Create",
    blurb: "Turn a winning idea into something you can film.",
    tools: [
      { name: "Script Generator", icon: "edit_note", desc: "Generate a hook-first Shorts script from a topic or straight from a competitor's video, structured the way outliers in your niche are built." },
    ],
  },
  {
    heading: "Analyze",
    blurb: "Judge any channel or video with real signals.",
    tools: [
      { name: "Trust Score", icon: "verified_user", desc: "Score any channel 0–100 on engagement, retention, consistency, authority, and growth, tell genuinely strong channels from inflated ones." },
      { name: "Channel Audit", icon: "fact_check", desc: "A full performance breakdown of a channel, what's working, what's dragging, and where the easy wins are." },
      { name: "Shorts Transcript", icon: "description", desc: "Pull a clean, copy-ready transcript from any Short in seconds, for research, scripting, or repurposing." },
    ],
  },
];

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <div className="group h-full rounded-3xl border border-white/[0.08] bg-[#171d2b] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#01D4FF]/30 hover:shadow-[0_20px_50px_rgba(1,212,255,0.08)]">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#01D4FF]/20 bg-[#01D4FF]/10 text-[#01D4FF]">
        <MSym name={tool.icon} size={26} />
      </div>
      <h3 className="font-heading text-[20px] font-bold text-white">{tool.name}</h3>
      <p className="mt-2.5 text-[15px] leading-relaxed text-white/55">{tool.desc}</p>
    </div>
  );
}

export function LpToolsGrid() {
  const total = GROUPS.reduce((n, g) => n + g.tools.length, 0);
  return (
    <section id="tools" className="mx-auto max-w-[1180px] px-5 md:px-8 py-24 md:py-32">
      <Reveal>
        <span className="inline-flex items-center rounded-full border border-[#01D4FF]/30 bg-[#01D4FF]/10 px-4 py-1.5 text-[13px] font-bold text-[#01D4FF]">
          {total} TOOLS · MORE ON THE WAY
        </span>
        <h2 className="font-heading mt-6 text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.01em] text-white max-w-[820px]">
          Every tool you need to{" "}
          <span className="bg-gradient-to-r from-[#0FA5E9] to-[#01D4FF] bg-clip-text text-transparent">research, create, and analyze</span>
        </h2>
        <p className="mt-5 text-[18px] leading-relaxed text-white/60 max-w-[620px]">
          One workspace for the whole faceless-creator workflow, from finding competitors to
          shipping the script. Here&apos;s everything that&apos;s live today.
        </p>
      </Reveal>

      <div className="mt-16 flex flex-col gap-16">
        {GROUPS.map((group, gi) => (
          <div key={group.heading}>
            <Reveal>
              <div className="mb-7 flex items-baseline gap-4">
                <h3 className="font-heading text-[24px] font-bold text-white">{group.heading}</h3>
                <span className="text-[15px] text-white/50">{group.blurb}</span>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.tools.map((tool, ti) => (
                <Reveal key={tool.name} delay={(gi === 0 ? ti : 0) * 0.06}>
                  <ToolCard tool={tool} />
                </Reveal>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
