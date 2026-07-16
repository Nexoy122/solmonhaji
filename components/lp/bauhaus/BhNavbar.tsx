"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BhButton, BhLogoMark } from "./BhKit";
import { BhThemeToggle } from "./BhTheme";

const LINKS = [
  { label: "Tools", href: "#tools" },
  { label: "Reviews", href: "#reviews" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function BhNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-[110] border-b-4 bh-border bh-bg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-20 md:px-8">
        {/* play-button logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <BhLogoMark size={26} />
          <span className="text-[20px] font-black uppercase tracking-tighter bh-text md:text-[24px]">NicheSpy</span>
        </Link>

        {/* center nav */}
        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[15px] font-bold uppercase tracking-wide bh-text transition-colors duration-200 hover:text-[#FF0033]">
              {l.label}
            </a>
          ))}
        </div>

        {/* right CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <BhThemeToggle />
          <Link href="/login" className="text-[14px] font-bold uppercase tracking-wide bh-text transition-colors hover:text-[#FF0033]">
            Sign In
          </Link>
          <BhButton href="/signup" color="red">Sign Up</BhButton>
        </div>

        {/* mobile: theme + menu */}
        <div className="flex items-center gap-2 md:hidden">
          <BhThemeToggle />
          <button onClick={() => setOpen((o) => !o)} className="flex h-10 w-10 items-center justify-center border-2 bh-border bh-surface bh-text bh-sh-3" aria-label="Menu">
            {open ? <X className="h-5 w-5" strokeWidth={3} /> : <Menu className="h-5 w-5" strokeWidth={3} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t-2 bh-border bh-bg px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b-2 bh-border py-3 text-[16px] font-bold uppercase tracking-wide bh-text opacity-80">
                {l.label}
              </a>
            ))}
            <div className="mt-3 flex gap-3">
              <BhButton href="/login" color="outline" className="flex-1">Sign In</BhButton>
              <BhButton href="/signup" color="red" className="flex-1">Sign Up</BhButton>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
