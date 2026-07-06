"use client";

// Distinct animated motion graphics per tool. Each is a self-contained SVG
// scene, cyan-brand tinted, that visually represents what the tool does.
// Keyed by parent so they replay on tool change.

const CYAN = "#0FA5E9";
const CYAN_SOFT = "#4fc3f7";

// ── Trust Score: a shield with a 0→100 sweeping arc gauge ──
export function TrustGraphic() {
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full">
      <defs>
        <linearGradient id="tg-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={CYAN_SOFT} />
          <stop offset="1" stopColor={CYAN} />
        </linearGradient>
      </defs>
      {/* gauge track */}
      <circle cx="120" cy="120" r="72" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
      {/* animated gauge fill */}
      <circle
        cx="120" cy="120" r="72" fill="none" stroke="url(#tg-g)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray="452" transform="rotate(-90 120 120)"
      >
        <animate attributeName="stroke-dashoffset" values="452;110;110" dur="2.4s" begin="0s" fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1;0 0 1 1" keyTimes="0;0.7;1" />
      </circle>
      {/* shield */}
      <path d="M120 78 l30 12 v26 c0 26-16 40-30 46 c-14-6-30-20-30-46 v-26 z" fill={CYAN} opacity="0.12" stroke={CYAN} strokeWidth="2" />
      <path d="M108 122 l9 9 18-20" fill="none" stroke={CYAN_SOFT} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dasharray" values="0 40;40 40" dur="0.6s" begin="1s" fill="freeze" />
      </path>
    </svg>
  );
}

// ── Niche Researcher: bars racing up + a scanning magnifier ──
export function NicheGraphic() {
  const bars = [
    { x: 74, h: 40, d: "0s" },
    { x: 100, h: 68, d: "0.15s" },
    { x: 126, h: 52, d: "0.3s" },
    { x: 152, h: 84, d: "0.45s" },
  ];
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full">
      <line x1="66" y1="164" x2="184" y2="164" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      {bars.map((b, i) => (
        <rect key={i} x={b.x} width="18" rx="3" fill={i === 3 ? CYAN : "rgba(15,165,233,0.4)"}>
          <animate attributeName="height" values={`0;${b.h}`} dur="0.9s" begin={b.d} fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1" />
          <animate attributeName="y" values={`164;${164 - b.h}`} dur="0.9s" begin={b.d} fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1" />
        </rect>
      ))}
      {/* scanning magnifier */}
      <g>
        <circle cx="0" cy="0" r="20" fill="none" stroke={CYAN_SOFT} strokeWidth="4" />
        <line x1="14" y1="14" x2="26" y2="26" stroke={CYAN_SOFT} strokeWidth="4" strokeLinecap="round" />
        <animateTransform attributeName="transform" type="translate" values="90,80; 150,110; 100,70; 90,80" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1" keyTimes="0;0.4;0.8;1" />
      </g>
    </svg>
  );
}

// ── Script Writer: a document with lines typing themselves in + cursor ──
export function ScriptGraphic() {
  const lines = [
    { y: 92, w: 96, d: "0s" },
    { y: 108, w: 72, d: "0.5s" },
    { y: 124, w: 108, d: "1s" },
    { y: 140, w: 60, d: "1.5s" },
  ];
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full">
      <rect x="72" y="60" width="96" height="120" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      {lines.map((l, i) => (
        <rect key={i} x="84" y={l.y} height="6" rx="3" fill={CYAN} opacity="0.75">
          <animate attributeName="width" values={`0;${l.w}`} dur="0.45s" begin={l.d} fill="freeze" calcMode="linear" />
        </rect>
      ))}
      {/* blinking cursor */}
      <rect x="84" y="156" width="3" height="12" fill={CYAN_SOFT}>
        <animate attributeName="opacity" values="1;0;1" dur="0.9s" begin="2s" repeatCount="indefinite" />
      </rect>
      {/* pen */}
      <g transform="translate(150 150) rotate(45)">
        <rect x="-4" y="-26" width="8" height="34" rx="3" fill={CYAN} />
        <path d="M-4 8 L4 8 L0 18 Z" fill={CYAN_SOFT} />
      </g>
    </svg>
  );
}

// ── Explore: a scanning radar sweep discovering channel dots ──
export function ExploreGraphic() {
  const dots = [
    { x: 150, y: 96 }, { x: 168, y: 132 }, { x: 96, y: 150 },
    { x: 138, y: 158 }, { x: 108, y: 108 }, { x: 156, y: 150 },
  ];
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full">
      {[40, 66, 92].map((r) => (
        <circle key={r} cx="120" cy="120" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      ))}
      <line x1="28" y1="120" x2="212" y2="120" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
      <line x1="120" y1="28" x2="120" y2="212" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
      {/* rotating sweep wedge */}
      <g style={{ transformOrigin: "120px 120px" }}>
        <path d="M120 120 L120 28 A92 92 0 0 1 200 74 Z" fill={CYAN} opacity="0.14" />
        <line x1="120" y1="120" x2="120" y2="28" stroke={CYAN_SOFT} strokeWidth="2" />
        <animateTransform attributeName="transform" type="rotate" from="0 120 120" to="360 120 120" dur="3.2s" repeatCount="indefinite" />
      </g>
      {/* discovered dots blipping in */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="4" fill={CYAN}>
          <animate attributeName="opacity" values="0;1;1;0.3" dur="3.2s" begin={`${i * 0.5}s`} repeatCount="indefinite" keyTimes="0;0.1;0.6;1" />
          <animate attributeName="r" values="0;5;4" dur="0.5s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

// ── Channel Audit: a checklist auditing rows one by one ──
export function AuditGraphic() {
  const rows = [82, 104, 126, 148];
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full">
      <rect x="66" y="60" width="108" height="120" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      {rows.map((y, i) => (
        <g key={i}>
          {/* check box */}
          <rect x="80" y={y} width="14" height="14" rx="4" fill={CYAN} opacity="0.15" stroke={CYAN} strokeWidth="1.5">
            <animate attributeName="opacity" values="0.15;0.15;0.4" dur="2.4s" begin={`${0.4 + i * 0.4}s`} fill="freeze" />
          </rect>
          <path d={`M83 ${y + 7} l3 3 l6 -7`} fill="none" stroke={CYAN_SOFT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <animate attributeName="stroke-dasharray" values="0 20;20 20" dur="0.4s" begin={`${0.4 + i * 0.4}s`} fill="freeze" />
          </path>
          {/* row label */}
          <rect x="104" y={y + 3} height="7" rx="3.5" fill="rgba(255,255,255,0.18)">
            <animate attributeName="width" values={`0;${44 + (i % 2) * 20}`} dur="0.4s" begin={`${i * 0.4}s`} fill="freeze" />
          </rect>
        </g>
      ))}
    </svg>
  );
}

// ── Shorts Transcript: a Short with text lines transcribing out of it ──
export function TranscriptGraphic() {
  const lines = [
    { y: 94, w: 66, d: "0.4s" }, { y: 110, w: 50, d: "0.9s" },
    { y: 126, w: 72, d: "1.4s" }, { y: 142, w: 40, d: "1.9s" },
  ];
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full">
      {/* short frame */}
      <rect x="52" y="76" width="56" height="88" rx="8" fill="rgba(15,165,233,0.1)" stroke={CYAN} strokeWidth="2" />
      <path d="M72 108 L92 120 L72 132 Z" fill={CYAN_SOFT} />
      {/* arrow */}
      <path d="M114 120 h18 m-5 -5 l5 5 l-5 5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* transcript lines */}
      {lines.map((l, i) => (
        <rect key={i} x="142" y={l.y} height="7" rx="3.5" fill={CYAN} opacity="0.7">
          <animate attributeName="width" values={`0;${l.w}`} dur="0.4s" begin={l.d} fill="freeze" />
        </rect>
      ))}
    </svg>
  );
}

export const TOOL_GRAPHICS: Record<string, () => React.ReactElement> = {
  explore: ExploreGraphic,
  trust: TrustGraphic,
  niche: NicheGraphic,
  script: ScriptGraphic,
  audit: AuditGraphic,
  transcript: TranscriptGraphic,
};
