import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// Node runtime (not edge) so we can read the font + logo straight from disk —
// no same-origin HTTP fetch that can silently fail behind nginx and drop us
// back to a thin fallback font.
export const runtime = "nodejs";

// Bauhaus score colors — green / blue / yellow / red.
function scoreHex(s: number) {
  if (s >= 75) return "#118A3E";
  if (s >= 60) return "#1040C0";
  if (s >= 45) return "#F0C020";
  return "#D02020";
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
          padding: "64px 56px",
          background: "#F0F0F0",
          backgroundImage: "radial-gradient(#12121233 2px, transparent 2px)",
          backgroundSize: "26px 26px",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Anton, sans-serif",
          border: "12px solid #121212",
        }}
      >
        {/* Bauhaus corner shapes */}
        <div style={{ position: "absolute", top: 44, left: 44, width: 72, height: 72, borderRadius: 999, border: "6px solid #121212", background: "#F0C020", display: "flex" }} />
        <div style={{ position: "absolute", top: 44, right: 44, width: 72, height: 72, border: "6px solid #121212", background: "#1040C0", transform: "rotate(45deg)", display: "flex" }} />

        {/* header */}
        <div style={{ display: "flex", fontSize: 32, letterSpacing: 8, color: "#121212", marginTop: 12 }}>TRUSTSCORE</div>
        <div style={{ display: "flex", fontSize: 68, color: "#121212", marginTop: 8, textTransform: "uppercase" }}>{name}</div>

        {/* ring in a hard-bordered white block */}
        <div style={{ display: "flex", position: "relative", marginTop: 56, width: size + 64, height: size + 64, alignItems: "center", justifyContent: "center", background: "#ffffff", border: "6px solid #121212", boxShadow: "12px 12px 0 0 #121212" }}>
          <div style={{ display: "flex", position: "relative", width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E0E0E0" strokeWidth={stroke} />
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} />
            </svg>
            <div style={{ position: "absolute", top: 0, left: 0, width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", fontSize: 152, color: "#121212", lineHeight: 1 }}>{score}</div>
            </div>
          </div>
        </div>

        {/* label — solid block, thick border, hard shadow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 48,
            padding: "14px 40px",
            fontSize: 40,
            color: "#ffffff",
            background: color,
            border: "5px solid #121212",
            boxShadow: "8px 8px 0 0 #121212",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto", fontSize: 34, color: "#121212", textTransform: "uppercase" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={44} height={44} style={{ border: "3px solid #121212" }} alt="" />
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
