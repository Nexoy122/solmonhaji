import { Play, Eye, Clock, Zap } from "lucide-react";

const STATS = [
  { n: "500K+", label: "Shorts analyzed", sub: "outliers & trends", icon: Eye, color: "#FF0033" },
  { n: "100×", label: "Outliers surfaced", sub: "vs. channel average", icon: Zap, color: "#1040C0" },
  { n: "3–5", label: "Hours saved / week", sub: "vs. spreadsheets", icon: Clock, color: "#121212" },
  { n: "60s", label: "To full research", sub: "type a niche, done", icon: Play, color: "#FF0033" },
];

export function BhStats() {
  return (
    <section className="border-b-4 bh-border bg-[#F0C020] bh-dots">
      <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y-4 divide-black sm:grid-cols-2 sm:divide-x-4 lg:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-black text-white shadow-[4px_4px_0_0_#121212]"
                style={{ background: s.color }}
              >
                <Icon className="h-6 w-6" strokeWidth={2.75} />
              </span>
              <div className="text-[34px] font-black leading-none tracking-tighter text-black">{s.n}</div>
              <div>
                <div className="text-[15px] font-black uppercase tracking-tight text-black">{s.label}</div>
                <div className="text-[12.5px] font-bold uppercase tracking-wide text-black/60">{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
