"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// ── Bauhaus shared primitives ────────────────────────────────────────────────
// Colors
export const RED = "#D02020";
export const BLUE = "#1040C0";
export const YELLOW = "#F0C020";
export const BLACK = "#121212";

type BtnColor = "red" | "blue" | "yellow" | "outline";
const BTN_BG: Record<BtnColor, string> = {
  red: "bg-[#D02020] text-white",
  blue: "bg-[#1040C0] text-white",
  yellow: "bg-[#F0C020] text-black",
  outline: "bg-white text-black",
};

// Primary button — thick black border, hard offset shadow, press-down on click.
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
  const cls = `inline-flex items-center justify-center gap-2 border-2 border-black ${BTN_BG[color]} px-6 py-3 text-[15px] font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_#121212] transition-all duration-200 ease-out hover:brightness-95 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${pill ? "rounded-full" : "rounded-none"} ${className}`;
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
  const cornerColor = corner === "red" ? "bg-[#D02020]" : corner === "blue" ? "bg-[#1040C0]" : "bg-[#F0C020]";
  const cornerShape = shape === "circle" ? "rounded-full" : shape === "triangle" ? "bh-triangle" : "rounded-none";
  return (
    <div className={`relative border-2 border-black bg-white shadow-[6px_6px_0px_0px_#121212] md:border-4 ${hover ? "transition-transform duration-200 ease-out hover:-translate-y-1" : ""} ${className}`}>
      <span className={`absolute right-3 top-3 h-3 w-3 ${cornerColor} ${cornerShape}`} />
      {children}
    </div>
  );
}

// The geometric brand mark: circle + square + triangle in the primaries.
export function BhLogoMark({ size = 28 }: { size?: number }) {
  const s = size / 3;
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      <span style={{ width: s, height: s }} className="rounded-full border-2 border-black bg-[#D02020]" />
      <span style={{ width: s, height: s }} className="rounded-none border-2 border-black bg-[#1040C0]" />
      <span style={{ width: s, height: s }} className="bh-triangle border-2 border-black bg-[#F0C020]" />
    </span>
  );
}

// Small uppercase section label.
export function BhLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-block text-[12px] font-bold uppercase tracking-widest ${className}`}>
      {children}
    </span>
  );
}
