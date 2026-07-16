"use client";

import { useState } from "react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

// Shared landing-page button, same shape, stacked soft shadow, gradient-fill +
// gradient-border, hover-brighten and active-press as LpSignupButton (the "Get
// Started Free" button), but color-parameterized so each button keeps its own
// color. The gradients are applied via inline `style` (not arbitrary Tailwind
// classes) so runtime-chosen colors always render, Tailwind's JIT only sees
// static class strings, so dynamic arbitrary values would be dropped.
type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "h-9 px-4 text-[14px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-8 text-[16px]",
};

// A tone = the flat fill + the three border-gradient stops (top-light, base,
// bottom-mid) + a brighter top stop for hover.
export type Tone = {
  fill: string;
  borderTop: string;
  borderBase: string;
  borderMid: string;
  hoverTop: string;
  text?: string;
};

export const TONES: Record<string, Tone> = {
  // Neutral dark "glass", for secondary buttons (See the tools, Sign In).
  slate: {
    fill: "#1a2130",
    borderTop: "#3a465c",
    borderBase: "#1a2130",
    borderMid: "#2a3346",
    hoverTop: "#4a566f",
    text: "#f2f5fa",
  },
  // Brand cyan, for the offer "Claim" button etc.
  cyan: {
    fill: "#0FA5E9",
    borderTop: "#7de3ff",
    borderBase: "#0FA5E9",
    borderMid: "#0d8fce",
    hoverTop: "#a6ecff",
    text: "#ffffff",
  },
};

// Two-layer background: solid fill (padding-box) + gradient border (border-box).
function bg(fill: string, top: string, base: string, mid: string) {
  return `linear-gradient(${fill},${fill}) padding-box, linear-gradient(180deg, ${top} 0%, ${base} 50%, ${mid} 100%) border-box`;
}

// The exact stacked soft shadow from the Get Started Free button.
const STACKED_SHADOW =
  "shadow-[0px_28px_8px_0px_rgba(0,0,0,0),0px_18px_7px_0px_rgba(0,0,0,0.01),0px_10px_6px_0px_rgba(0,0,0,0.02),0px_4px_4px_0px_rgba(0,0,0,0.05),0px_1px_2px_0px_rgba(0,0,0,0.05)]";

export function LpButton({
  children,
  href,
  onClick,
  size = "md",
  tone = TONES.slate,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  size?: Size;
  tone?: Tone;
  className?: string;
  type?: "button" | "submit";
}) {
  const [hover, setHover] = useState(false);

  const cls = `inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-300 ease-in-out border border-transparent ${SIZE[size]} ${STACKED_SHADOW} active:scale-[0.98] ${className}`;

  const style: CSSProperties = {
    color: tone.text ?? "#f7f7f7",
    background: bg(
      tone.fill,
      hover ? tone.hoverTop : tone.borderTop,
      tone.borderBase,
      tone.borderMid),
  };

  const hoverProps = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
  };

  if (href) {
    return (
      <Link href={href} className={cls} style={style} {...hoverProps}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={cls} style={style} {...hoverProps}>
      {children}
    </button>
  );
}
