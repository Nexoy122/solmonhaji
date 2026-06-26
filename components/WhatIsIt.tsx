import { Reveal } from "./Reveal";

const COLUMNS = [
  {
    t: "The old way",
    sub: "Hours lost every week",
    accent: "error",
    mark: "✕",
    items: ["3–5 hours every week", "20+ browser tabs open", "Manual spreadsheets", "Guessing what works"],
  },
  {
    t: "The NicheSpy way",
    sub: "Done in 60 seconds",
    accent: "primary",
    featured: true,
    mark: "✓",
    items: ["60-second niche scans", "One clean dashboard", "Real algorithm signals", "Data-backed decisions"],
  },
  {
    t: "Built for",
    sub: "Creators like you",
    accent: "tertiary",
    mark: "→",
    items: ["Faceless / automation channels", "1k–100k subscriber creators", "New channels finding a niche", "US & EU markets"],
  },
];

const accentText: Record<string, string> = {
  error: "text-error",
  primary: "text-primary",
  tertiary: "text-tertiary",
};
const accentChip: Record<string, string> = {
  error: "bg-error-container text-on-error-container",
  primary: "bg-primary text-on-primary",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
};

export function WhatIsIt() {
  return (
    <section className="mx-auto max-w-[1180px] px-5 md:px-8 py-24 md:py-32">
      {/* eyebrow */}
      <Reveal className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-4 py-1.5 text-[13px] font-bold uppercase tracking-wider text-on-primary-container">
          Why NicheSpy
        </span>
      </Reveal>

      <Reveal delay={0.05}>
        <h2 className="mx-auto mt-6 max-w-[920px] text-center text-headline-large">
          Competitor research used to take{" "}
          <span className="text-on-surface-variant">hours of tab-hopping and spreadsheets.</span>{" "}
          <span className="text-primary font-bold">NicheSpy does it in 60 seconds.</span>
        </h2>
      </Reveal>

      {/* comparison cards */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
        {COLUMNS.map((col, i) => (
          <Reveal key={col.t} delay={i * 0.08} className="h-full">
            <div
              className={`relative h-full rounded-[28px] p-8 transition-all duration-300 hover:-translate-y-1 ${
                col.featured
                  ? "bg-surface-container-lowest border-2 border-primary m3-card"
                  : "bg-surface-container-lowest border border-outline-variant"
              }`}
            >
              {col.featured && (
                <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-on-primary">
                  Recommended
                </span>
              )}
              <div className={`mb-1 inline-flex rounded-lg px-3 py-1 text-[12px] font-bold uppercase tracking-wide ${accentChip[col.accent]}`}>
                {col.t}
              </div>
              <div className="mb-6 mt-2 text-title-large">{col.sub}</div>
              <ul className="flex flex-col gap-4">
                {col.items.map((it) => (
                  <li key={it} className="flex items-start gap-3 text-body-large text-on-surface-variant">
                    <span className={`mt-0.5 text-lg font-bold ${accentText[col.accent]}`}>{col.mark}</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
