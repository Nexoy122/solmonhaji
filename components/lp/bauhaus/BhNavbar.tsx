"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BhButton, BhLogoMark } from "./BhKit";

const LINKS = [
  { label: "Tools", href: "#tools" },
  { label: "Reviews", href: "#reviews" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function BhNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-[110] border-b-4 border-black bg-[#F0F0F0]">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-20 md:px-8">
        {/* geometric logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <BhLogoMark size={30} />
          <span className="text-[20px] font-black uppercase tracking-tighter text-black md:text-[24px]">NicheSpy</span>
        </Link>

        {/* center nav */}
        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[15px] font-bold uppercase tracking-wide text-black transition-colors duration-200 hover:text-[#D02020]">
              {l.label}
            </a>
          ))}
        </div>

        {/* right CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-[14px] font-bold uppercase tracking-wide text-black transition-colors hover:text-[#1040C0]">
            Sign In
          </Link>
          <BhButton href="/signup" color="red">Sign Up</BhButton>
        </div>

        {/* mobile toggle */}
        <button onClick={() => setOpen((o) => !o)} className="flex h-11 w-11 items-center justify-center border-2 border-black bg-white shadow-[3px_3px_0px_0px_#121212] md:hidden" aria-label="Menu">
          {open ? <X className="h-6 w-6" strokeWidth={3} /> : <Menu className="h-6 w-6" strokeWidth={3} />}
        </button>
      </nav>

      {open && (
        <div className="border-t-2 border-black bg-[#F0F0F0] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b-2 border-black/10 py-3 text-[16px] font-bold uppercase tracking-wide text-black">
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
