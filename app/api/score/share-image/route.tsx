import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

function scoreHex(s: number) {
  if (s >= 75) return "#16a34a";
  if (s >= 60) return "#0FA5E9";
  if (s >= 45) return "#d97706";
  return "#e11d48";
}

// Public, shareable Trust Score card (PNG). No auth needed — only renders the
// numbers passed in the query string (no private data).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const score = Math.max(0, Math.min(100, parseInt(searchParams.get("score") ?? "0", 10) || 0));
  const name = (searchParams.get("name") ?? "Your channel").slice(0, 40);
  const label = (searchParams.get("label") ?? "").slice(0, 24);
  const color = scoreHex(score);

  // Ring geometry
  const size = 300;
  const stroke = 16;
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#07080d",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* gradient glow */}
        <div style={{ position: "absolute", bottom: -120, left: -80, width: 500, height: 400, background: "radial-gradient(circle, rgba(124,58,237,0.55), transparent 70%)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -120, right: -80, width: 500, height: 400, background: "radial-gradient(circle, rgba(15,165,233,0.5), transparent 70%)", display: "flex" }} />

        {/* card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 600,
            padding: "56px 40px",
            borderRadius: 36,
            background: "rgba(16,18,24,0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 4, color: "#9aa0ad" }}>TRUST SCORE</div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#ffffff", marginTop: 10 }}>{name}</div>

          {/* ring */}
          <div style={{ display: "flex", position: "relative", marginTop: 44, width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
            </svg>
            <div style={{ position: "absolute", top: 0, left: 0, width: size, height: size, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "center", fontSize: 96, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>{score}</div>
              {label ? <div style={{ display: "flex", justifyContent: "center", fontSize: 22, fontWeight: 600, color }}>{label}</div> : null}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 48, fontSize: 22, fontWeight: 600, color: "#cdd1d9" }}>
            powered by NicheSpy
          </div>
        </div>
      </div>
    ),
    { width: 800, height: 1000 }
  );
}
