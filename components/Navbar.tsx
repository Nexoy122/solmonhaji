"use client";

import { useEffect, useState } from "react";
import { openReferralModal } from "./ReferralModal";

function Logo({ size = 32 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/favicon.webp"
      alt="NicheSpy"
      width={size}
      height={size}
      className="shrink-0 rounded-xl"
      style={{ width: size, height: size }}
    />
  );
}

export function Navbar({ topOffset = 0 }: { topOffset?: number }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{ top: topOffset }}
      className={`fixed inset-x-0 z-[100] transition-all duration-300 ${
        scrolled ? "border-b border-outline-variant bg-surface/85 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 md:px-8 py-3.5">
        <a href="#top" className="flex items-center gap-2.5 text-[20px] font-bold tracking-[-0.4px]">
          <Logo />
          NicheSpy
        </a>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-body-medium text-on-surface-variant transition-colors hover:text-on-surface">Features</a>
          <a href="#how" className="text-body-medium text-on-surface-variant transition-colors hover:text-on-surface">How it works</a>
          <a href="#faq" className="text-body-medium text-on-surface-variant transition-colors hover:text-on-surface">FAQ</a>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openReferralModal}
            className="m3-btn-tonal !h-10 !px-4 !text-[14px] max-sm:!px-3"
          >
            Referral code
          </button>
          <a href="#top" className="m3-btn-filled !h-10 !px-5 !text-[14px] max-sm:!px-4">
            Join the Waitlist
          </a>
        </div>
      </div>
    </nav>
  );
}

export { Logo };
