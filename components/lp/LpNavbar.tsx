"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LpSignupButton } from "./LpSignupButton";
import { LpButton } from "./LpButton";

// Dark product navbar for the landing page (vidIQ-style): logo, section links,
// Sign In + Sign Up. Distinct from the light waitlist TopBar. Goes solid on scroll.
const LINKS = [
  { label: "Tools", href: "#tools" },
  { label: "Reviews", href: "#reviews" },
  { label: "Partners", href: "#partners" },
  { label: "Pricing", href: "#pricing" },
];

export function LpNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[110] border-b bg-[#0A0D15] transition-colors duration-300 ${
        scrolled ? "border-white/[0.08]" : "border-white/[0.04]"
      }`}
    >
      <nav className="relative flex h-16 items-center justify-between px-5 md:px-8">
        {/* LOGO — left */}
        <Link href="/" className="flex items-center gap-2.5 font-heading text-[19px] font-bold text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.webp" alt="" width={30} height={30} className="rounded-lg" />
          NicheSpy
        </Link>

        {/* ITEMS — centered */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[15px] font-medium text-white/60 transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <LpButton href="/login" size="sm" className="hidden font-semibold sm:inline-flex">
            Sign In
          </LpButton>
          <LpSignupButton size="sm" />
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white/70 lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-white/[0.07] bg-[#0f1420] px-5 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-white/70 hover:bg-white/[0.05] hover:text-white">
                {l.label}
              </a>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-white/70 hover:bg-white/[0.05] hover:text-white sm:hidden">
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
