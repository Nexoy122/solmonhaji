import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

function scoreHex(s: number) {
  if (s >= 75) return "#34d399";
  if (s >= 60) return "#01D4FF";
  if (s >= 45) return "#e0b341";
  return "#f87171";
}

// Public, shareable Trust Score card (PNG). No auth needed — only renders the
// numbers passed in the query string (no private data).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const score = Math.max(0, Math.min(100, parseInt(searchParams.get("score") ?? "0", 10) || 0));
  const name = (searchParams.get("name") ?? "Your channel").slice(0, 40);
  const color = scoreHex(score);

  // Ring geometry
  const size = 300;
  const stroke = 12;
  const r = size / 2 - stroke;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050506",
          fontFamily: "sans-serif",
        }}
      >
        {/* card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 720,
            height: 900,
            padding: "72px 48px",
            borderRadius: 40,
            background: "#0a0a0c",
            border: "1px solid rgba(255,255,255,0.06)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* gradient glow — blue (left) → purple (right), pooled at the bottom */}
          <div style={{ position: "absolute", bottom: -220, left: -140, width: 620, height: 620, background: "radial-gradient(circle, rgba(1,212,255,0.55), transparent 68%)", display: "flex" }} />
          <div style={{ position: "absolute", bottom: -220, right: -140, width: 620, height: 620, background: "radial-gradient(circle, rgba(139,92,246,0.6), transparent 68%)", display: "flex" }} />

          {/* header */}
          <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 3, color: "#8b8f98" }}>TRUSTSCORE</div>
          <div style={{ display: "flex", fontSize: 46, fontWeight: 800, color: "#e9eaec", marginTop: 14 }}>{name}</div>

          {/* ring */}
          <div style={{ display: "flex", position: "relative", marginTop: 96, width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} />
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
            </svg>
            <div style={{ position: "absolute", top: 0, left: 0, width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", fontSize: 128, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>{score}</div>
            </div>
          </div>

          {/* footer */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto", fontSize: 26, fontWeight: 700, color: "#d4d6da" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9, background: "#01D4FF", color: "#050506", fontSize: 20, fontWeight: 800 }}>N</div>
            powered by NicheSpy
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
