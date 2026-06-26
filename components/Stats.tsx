import { Reveal } from "./Reveal";

const STATS = [
  { big: "3–5", label: "hours saved per week" },
  { big: "60s", label: "full competitor analysis" },
  { big: "∞", label: "niches supported" },
];

export function Stats() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 md:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {STATS.map((s, i) => (
          <Reveal key={i} delay={i * 0.08}>
            <div className="rounded-[28px] bg-surface-container-low px-10 py-12 text-center">
              <div className="mb-3 text-[64px] font-bold leading-none tracking-[-2px] text-primary">{s.big}</div>
              <div className="text-body-large text-on-surface-variant">{s.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
