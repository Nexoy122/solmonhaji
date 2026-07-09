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
  const { searchParams, origin } = req.nextUrl;
  const score = Math.max(0, Math.min(100, parseInt(searchParams.get("score") ?? "0", 10) || 0));
  const name = (searchParams.get("name") ?? "Your channel").slice(0, 40);
  const color = scoreHex(score);
  // Prefer the public host (behind nginx) so the logo loads from the same origin.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : origin;
  const logoSrc = `${base}/logo-mark.png`;

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
          <div style={{ display: "flex", fontSize: 28, fontWeight: 900, letterSpacing: 4, color: "#9aa0ad" }}>TRUSTSCORE</div>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 900, color: "#ffffff", marginTop: 14 }}>{name}</div>

          {/* ring */}
          <div style={{ display: "flex", position: "relative", marginTop: 96, width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} />
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
            </svg>
            <div style={{ position: "absolute", top: 0, left: 0, width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", fontSize: 132, fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>{score}</div>
            </div>
          </div>

          {/* footer */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto", fontSize: 27, fontWeight: 800, color: "#e2e4e8" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={38} height={38} style={{ borderRadius: 9 }} alt="" />
            powered by NicheSpy
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
