const ITEMS = [
  "COMPETITOR FINDER",
  "OUTLIER DETECTOR",
  "GAP FINDER",
  "VIRAL ALERTS",
  "COMPETITOR DASHBOARD",
  "TRUST SCORE",
  "60 SECOND ANALYSIS",
  "SAVE 3–5 HRS/WEEK",
];

export function Ticker() {
  // duplicate the list so the -50% translate loop is seamless
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden border-y border-outline-variant bg-surface-container-low py-4">
      <div className="flex w-max animate-ticker">
        {loop.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-10 text-[15px] font-semibold tracking-wide text-on-surface-variant"
          >
            {item}
            <span className="text-primary">●</span>
          </div>
        ))}
      </div>
    </div>
  );
}
