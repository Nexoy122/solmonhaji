"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

// ── Bauhaus × YouTube shared primitives ──────────────────────────────────────
// The palette is red-forward (YouTube), with blue/yellow kept as Bauhaus accents.
// Surfaces/borders/shadows come from CSS vars so both themes work from one tree.
export const RED = "#FF0033";
export const BLUE = "#1040C0";
export const YELLOW = "#F0C020";
export const BLACK = "#121212";

type BtnColor = "red" | "blue" | "yellow" | "outline";
const BTN_BG: Record<BtnColor, string> = {
  red: "bg-[#FF0033] text-white",
  blue: "bg-[#1040C0] text-white",
  yellow: "bg-[#F0C020] text-black",
  outline: "bh-surface bh-text",
};

// Primary button, thick border, hard offset shadow, press-down on click.
export function BhButton({
  children,
  href,
  color = "red",
  pill = false,
  className = "",
  onClick,
}: {
  children: ReactNode;
  href?: string;
  color?: BtnColor;
  pill?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const cls = `inline-flex items-center justify-center gap-2 border-2 bh-border ${BTN_BG[color]} px-6 py-3 text-[15px] font-bold uppercase tracking-wider bh-sh-4 transition-all duration-200 ease-out hover:brightness-95 active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none ${pill ? "rounded-full" : "rounded-none"} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

// A hard-bordered card with a colored geometric corner decoration.
export function BhCard({
  children,
  corner = "red",
  shape = "square",
  className = "",
  hover = true,
}: {
  children: ReactNode;
  corner?: "red" | "blue" | "yellow";
  shape?: "square" | "circle" | "triangle";
  className?: string;
  hover?: boolean;
}) {
  const cornerColor = corner === "red" ? "bg-[#FF0033]" : corner === "blue" ? "bg-[#1040C0]" : "bg-[#F0C020]";
  const cornerShape = shape === "circle" ? "rounded-full" : shape === "triangle" ? "bh-triangle" : "rounded-none";
  return (
    <div className={`relative border-2 bh-border bh-surface bh-sh-6 md:border-4 ${hover ? "transition-transform duration-200 ease-out hover:-translate-y-1" : ""} ${className}`}>
      <span className={`absolute right-3 top-3 h-3 w-3 ${cornerColor} ${cornerShape}`} />
      {children}
    </div>
  );
}

// Brand mark. Re-exports the shared <Logo> so every surface uses the same art.
export function BhLogoMark({ size = 30 }: { size?: number }) {
  return <Logo size={size} />;
}

// Small uppercase section label.
export function BhLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-block text-[12px] font-bold uppercase tracking-widest ${className}`}>
      {children}
    </span>
  );
}

// ── YouTube-flavored pieces ──────────────────────────────────────────────────

// Format a view count the way YouTube does.
export function views(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(n);
}

// A 9:16 Shorts card, the core visual motif. No real images: the "thumbnail" is
// a bold geometric color field, which keeps the Bauhaus language while reading
// unmistakably as a Short.
export function BhShortCard({
  bg,
  title,
  channel,
  viewCount,
  outlier,
  className = "",
  rotate = 0,
  video,
  poster,
}: {
  bg: string;
  title: string;
  channel: string;
  viewCount: number;
  outlier?: string;
  className?: string;
  rotate?: number;
  /** Real Shorts footage. When set, it replaces the flat color thumbnail. */
  video?: string;
  poster?: string;
}) {
  return (
    <div
      className={`relative w-full border-2 bh-border bh-surface bh-sh-6 md:border-4 ${className}`}
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      {/* thumbnail, 9:16 like a real Short */}
      <div className="relative aspect-[9/16] overflow-hidden border-b-2 bh-border md:border-b-4" style={{ background: bg }}>
        {video ? (
          <>
            <video
              src={video}
              poster={poster}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* slight scrim so the play button + badges stay readable on busy footage */}
            <span className="absolute inset-0 bg-black/15" />
          </>
        ) : (
          <span className="absolute inset-0 bh-dots-light opacity-60" />
        )}
        {/* play button */}
        <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black bg-white/95 shadow-[3px_3px_0_0_rgba(0,0,0,.5)]">
          <span className="bh-play ml-[3px] h-[14px] w-[12px] bg-black" />
        </span>
        {/* outlier multiplier badge */}
        {outlier && (
          <span className="absolute left-2 top-2 border-2 border-black bg-[#F0C020] px-1.5 py-0.5 text-[11px] font-black uppercase leading-none tracking-wide text-black">
            {outlier}
          </span>
        )}
        {/* view count, bottom-left like YouTube */}
        <span className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white">
          ▶ {views(viewCount)}
        </span>
      </div>
      {/* meta */}
      <div className="p-2.5">
        <p className="line-clamp-2 text-[12.5px] font-bold leading-tight bh-text">{title}</p>
        <p className="mt-1 truncate text-[11px] font-medium opacity-60 bh-text">{channel}</p>
      </div>
    </div>
  );
}
