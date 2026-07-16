import { Search, Compass, ShieldCheck, PenLine, FileText, Radar, Check } from "lucide-react";
import { BhLabel } from "./BhKit";
import { BhToolVideo } from "./BhToolVideo";

const TOOLS = [
  { icon: Compass, name: "Discover", slug: "discover", desc: "See which Shorts are blowing up across your niche, outliers pulling 10–100× a channel's average.", corner: "#FF0033", cs: "square" },
  { icon: Search, name: "Explore", slug: "explore", desc: "Search any channel and break down its Shorts strategy, what it posts, what pops, how it's packaged.", corner: "#1040C0", cs: "circle" },
  { icon: Radar, name: "Niche Researcher", slug: "niche", desc: "Break any niche into sub-niches and find topics that are hot, saturated, or wide open.", corner: "#F0C020", cs: "triangle" },
  { icon: ShieldCheck, name: "Trust Score", slug: "trust", desc: "Connect your channel for a real score across 5 growth signals, with fixes ranked by impact.", corner: "#1040C0", cs: "square" },
  { icon: PenLine, name: "Script Generator", slug: "script", desc: "Turn an idea into a hook-first Shorts script, or improve one you already have.", corner: "#FF0033", cs: "circle" },
  { icon: FileText, name: "Shorts Transcript", slug: "transcript", desc: "Pull the full transcript of any Short in seconds, study hooks or reuse scripts.", corner: "#F0C020", cs: "triangle" },
];

const SOON = ["Channel Audit", "Voiceovers", "Editor", "Clipper", "Captions Generator", "Image Generator", "Video Upscaler", "Revenue Calculator"];

function CornerShape({ color, cs }: { color: string; cs: string }) {
  const shape = cs === "circle" ? "rounded-full" : cs === "triangle" ? "bh-triangle" : "rounded-none";
  return <span className={`absolute right-4 top-4 h-4 w-4 border-2 bh-border ${shape}`} style={{ background: color }} />;
}

export function BhTools() {
  return (
    <section id="tools" className="border-b-4 bh-border bh-bg">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-24">
        <div className="max-w-2xl">
          <BhLabel className="text-[#FF0033]">The toolkit</BhLabel>
          <h2 className="mt-4 text-[clamp(32px,5vw,64px)] font-black uppercase leading-[0.9] tracking-tighter bh-text">
            Every tool you need to grow
          </h2>
          <p className="mt-5 text-[17px] font-medium opacity-70 bh-text md:text-[18px]">Six tools live, more shipping every week, all in one workspace.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.name} className="group relative overflow-hidden border-2 bh-border bh-surface bh-sh-6 transition-transform duration-200 ease-out hover:-translate-y-2 md:border-4">
                {/* live demo of the real tool */}
                <BhToolVideo src={`/tools/${t.slug}.mp4`} poster={`/tools/${t.slug}.jpg`} label={t.name} />
                <div className="relative p-6">
                  <CornerShape color={t.corner} cs={t.cs} />
                  <span className="flex h-12 w-12 items-center justify-center border-2 bh-border bh-bg bh-text bh-sh-3 transition-transform duration-200 group-hover:scale-110">
                    <Icon className="h-6 w-6" strokeWidth={2.5} />
                  </span>
                  <h3 className="mt-4 text-[21px] font-black uppercase tracking-tight bh-text">{t.name}</h3>
                  <p className="mt-2 text-[14.5px] font-medium leading-relaxed opacity-70 bh-text">{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* coming soon */}
        <div className="mt-10 border-2 bh-border bh-surface bh-sh-6 p-6 md:border-4">
          <BhLabel className="opacity-50 bh-text">Coming soon</BhLabel>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {SOON.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 border-2 bh-border bh-bg px-3 py-1.5 text-[13px] font-bold uppercase tracking-wide bh-text">
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
