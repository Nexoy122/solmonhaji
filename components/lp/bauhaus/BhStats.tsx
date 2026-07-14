const STATS = [
  { n: "6", label: "Tools live", sub: "in one workspace", shape: "circle", color: "#D02020" },
  { n: "500K+", label: "Videos analyzed", sub: "outliers & trends", shape: "square", color: "#1040C0" },
  { n: "3–5", label: "Hours saved / wk", sub: "vs. spreadsheets", shape: "rot", color: "#121212" },
  { n: "5×", label: "Faster research", sub: "vs. by hand", shape: "circle", color: "#F0C020" },
];

function ShapeBadge({ shape, color, n }: { shape: string; color: string; n: string }) {
  const base = "flex h-20 w-20 items-center justify-center border-4 border-black text-[22px] font-black text-white";
  const light = color === "#F0C020";
  if (shape === "circle") return <span className={`${base} rounded-full ${light ? "!text-black" : ""}`} style={{ background: color }}>{n}</span>;
  if (shape === "rot") return <span className={`${base} rotate-45`} style={{ background: color }}><span className="-rotate-45">{n}</span></span>;
  return <span className={`${base} ${light ? "!text-black" : ""}`} style={{ background: color }}>{n}</span>;
}

export function BhStats() {
  return (
    <section className="border-b-4 border-black bg-[#F0C020] bh-dots">
      <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y-4 divide-black sm:grid-cols-2 sm:divide-x-4 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <ShapeBadge shape={s.shape} color={s.color} n={s.n} />
            <div>
              <div className="text-[18px] font-black uppercase tracking-tight text-black">{s.label}</div>
              <div className="text-[13px] font-bold uppercase tracking-wide text-black/60">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
