"use client";

import { useRef, useEffect, type ReactNode, type CSSProperties } from "react";

// React Bits "BorderGlow" — adapted to TypeScript and to run WITHOUT hover.
// A continuous animation sweeps the glow cone around the border so the card
// always shows a soft, premium moving glow (used for AI sections site-wide).

interface BorderGlowProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;        // "H S L" e.g. "199 89 55" (cyan)
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  speedMs?: number;          // ms for one full rotation
  proximity?: number;        // held edge-proximity (0-100); higher = brighter
  mesh?: boolean;            // colored mesh-gradient border (the fancy version)
  colors?: [string, string, string]; // mesh gradient colors
}

const GRADIENT_POSITIONS = ["80% 55%", "69% 34%", "8% 6%", "41% 38%", "86% 85%", "82% 18%", "51% 4%"];
const GRADIENT_KEYS = ["--gradient-one", "--gradient-two", "--gradient-three", "--gradient-four", "--gradient-five", "--gradient-six", "--gradient-seven"];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors: string[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`;
  }
  vars["--gradient-base"] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}

function parseHSL(hslStr: string) {
  const m = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!m) return { h: 199, s: 89, l: 55 };
  return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
}

function buildGlowVars(glowColor: string, intensity: number): Record<string, string> {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ["", "-60", "-50", "-40", "-30", "-20", "-10"];
  const vars: Record<string, string> = {};
  for (let i = 0; i < opacities.length; i++) {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;
  }
  return vars;
}

export default function BorderGlow({
  children,
  className = "",
  glowColor = "199 89 55",
  backgroundColor = "#F0F0F0",
  borderRadius = 16,
  glowRadius = 34,
  glowIntensity = 1.0,
  speedMs = 6000,
  proximity = 100,
  mesh = false,
  colors = ["#c084fc", "#f472b6", "#38bdf8"],
}: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Continuously rotate the glow cone (no pointer needed). Respects reduced motion.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--edge-proximity", String(proximity));

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      card.style.setProperty("--cursor-angle", "135deg");
      return;
    }

    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const angle = (((t - start) / speedMs) * 360) % 360;
      card.style.setProperty("--cursor-angle", `${angle.toFixed(2)}deg`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [proximity, speedMs]);

  const style = {
    "--card-bg": backgroundColor,
    "--edge-sensitivity": 30,
    "--color-sensitivity": 50,
    "--border-radius": `${borderRadius}px`,
    "--glow-padding": `${glowRadius}px`,
    "--cone-spread": 25,
    "--fill-opacity": 0.5,
    ...buildGlowVars(glowColor, glowIntensity),
    ...(mesh ? buildGradientVars(colors) : {}),
  } as CSSProperties;

  return (
    <div ref={cardRef} className={`border-glow-card is-live ${mesh ? "mesh" : ""} ${className}`} style={style}>
      <span className="edge-light" />
      <div className="border-glow-inner">{children}</div>
    </div>
  );
}
