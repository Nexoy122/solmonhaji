import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// Node runtime (not edge) so we can read the font + logo straight from disk —
// no same-origin HTTP fetch that can silently fail behind nginx and drop us
// back to a thin fallback font.
export const runtime = "nodejs";

function scoreHex(s: number) {
  if (s >= 75) return "#34d399";
  if (s >= 60) return "#01D4FF";
  if (s >= 45) return "#e0b341";
  return "#f87171";
}
function scoreLabel(s: number) {
  if (s >= 90) return "Exceptional";
  if (s >= 75) return "Strong";
  if (s >= 60) return "Good";
  if (s >= 45) return "Average";
  if (s >= 30) return "Below Average";
  return "Poor";
}

// Public, shareable Trust Score card (PNG). The canvas IS the card — no
// surrounding background — so it drops cleanly into any post/story.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const score = Math.max(0, Math.min(100, parseInt(searchParams.get("score") ?? "0", 10) || 0));
  const name = (searchParams.get("name") ?? "Your channel").slice(0, 40);
  const color = scoreHex(score);
  const label = scoreLabel(score);

  // Read the heavy display font (Anton) + logo from /public on disk. Anton is an
  // ultra-bold condensed face, so every element renders thick regardless of the
  // fontWeight Satori would otherwise ignore. Try a few candidate locations so
  // it works in dev, a normal `.next` build, and a standalone output.
  async function readAsset(file: string): Promise<Buffer> {
    const candidates = [
      path.join(process.cwd(), "public", file),
      path.join(process.cwd(), ".next", "standalone", "public", file),
      path.join(process.cwd(), "..", "public", file),
    ];
    for (const p of candidates) {
      try { return await readFile(p); } catch { /* try next */ }
    }
    throw new Error(`asset not found: ${file} (cwd=${process.cwd()})`);
  }

  let fontData: Buffer;
  let logoSrc = "";
  try {
    fontData = await readAsset("font-black.ttf");
    const logoBuf = await readAsset("logo-mark.png");
    logoSrc = `data:image/png;base64,${logoBuf.toString("base64")}`;
  } catch (e) {
    console.error("[share-image] asset load failed:", (e as Error).message);
    throw e;
  }

  // Canvas / ring geometry
  const W = 840;
  const H = 1050;
  const size = 340;
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
          padding: "80px 56px",
          background: "#0a0a0c",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Anton, sans-serif",
        }}
      >
        {/* gradient glow — brand cyan (left) → violet (right), pooled at the bottom */}
        <div style={{ position: "absolute", bottom: -260, left: -180, width: 720, height: 720, background: "radial-gradient(circle, rgba(1,212,255,0.6), transparent 66%)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -260, right: -180, width: 720, height: 720, background: "radial-gradient(circle, rgba(139,92,246,0.65), transparent 66%)", display: "flex" }} />
        <div style={{ position: "absolute", top: -160, left: "50%", marginLeft: -260, width: 520, height: 420, background: "radial-gradient(circle, rgba(255,255,255,0.05), transparent 70%)", display: "flex" }} />

        {/* header */}
        <div style={{ display: "flex", fontSize: 30, fontWeight: 900, letterSpacing: 6, color: "#8b8f98" }}>TRUSTSCORE</div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 900, color: "#ffffff", marginTop: 16 }}>{name}</div>

        {/* ring */}
        <div style={{ display: "flex", position: "relative", marginTop: 88, width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
          </svg>
          <div style={{ position: "absolute", top: 0, left: 0, width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", fontSize: 152, fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>{score}</div>
          </div>
        </div>

        {/* label pill — our touch, Satura doesn't have this */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 44,
            padding: "14px 34px",
            borderRadius: 999,
            fontSize: 34,
            fontWeight: 900,
            color,
            background: `${color}22`,
            border: `2px solid ${color}55`,
          }}
        >
          {label}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto", fontSize: 30, fontWeight: 900, color: "#ffffff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={44} height={44} style={{ borderRadius: 11 }} alt="" />
          NicheSpy
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [{ name: "Anton", data: fontData, weight: 400, style: "normal" }],
      headers: {
        // Don't let the browser/CDN serve a stale (old, thin-font) render.
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    }
  );
}
