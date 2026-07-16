"use client";

import type { ReactNode } from "react";
import { ThemeToggle, useTheme } from "@/components/ThemeToggle";

// The landing's theme is the site-wide theme (see components/ThemeToggle.tsx).
// The value lives on <html data-theme>, stamped pre-paint by THEME_INIT in
// app/layout.tsx, so there's no flash and dark is the default.
export const useLpTheme = useTheme;

// Kept so the page tree reads clearly; the theme itself needs no provider now
// that it lives on <html>.
export function BhThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function BhThemeToggle({ className = "" }: { className?: string }) {
  return <ThemeToggle variant="landing" className={className} />;
}
