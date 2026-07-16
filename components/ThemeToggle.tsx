"use client";

import { useEffect, useState, useCallback } from "react";
import { Moon, Sun } from "lucide-react";

// One theme setting for the whole site (landing + dashboard). The value lives on
// <html data-theme>, stamped pre-paint by THEME_INIT in app/layout.tsx so there's
// no flash. Dark is the default.
export const THEME_KEY = "nichespy-lp-theme";
export type Theme = "dark" | "light";

function current(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

// Reads/sets the site theme. Components re-render on change because we listen
// for the custom event the setter dispatches.
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(current());
    const onChange = () => setThemeState(current());
    window.addEventListener("theme:changed", onChange);
    return () => window.removeEventListener("theme:changed", onChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ }
    window.dispatchEvent(new Event("theme:changed"));
  }, []);

  const toggle = useCallback(() => {
    setTheme(current() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, setTheme, toggle };
}

// Sun/moon toggle, a hard-bordered Bauhaus block that presses down on click.
// `variant` picks the styling hook: the landing uses theme-aware token classes,
// the dashboard uses its own remapped utilities.
export function ThemeToggle({
  className = "",
  variant = "dashboard",
}: {
  className?: string;
  variant?: "landing" | "dashboard";
}) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const base =
    variant === "landing"
      ? "bh-border bh-surface bh-text bh-sh-3 active:bh-sh-none"
      : "border-black bg-white text-black shadow-[3px_3px_0px_0px_#121212] active:shadow-none";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 transition-all active:translate-x-[2px] active:translate-y-[2px] ${base} ${className}`}
    >
      {/* Render nothing until mounted so SSR (always dark) can't mismatch. */}
      {mounted && (theme === "dark"
        ? <Sun className="h-[18px] w-[18px]" strokeWidth={3} />
        : <Moon className="h-[18px] w-[18px]" strokeWidth={3} />)}
    </button>
  );
}
