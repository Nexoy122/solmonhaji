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
          <a
            href="/api/discord/login"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#5865F2] px-4 text-[14px] font-medium text-white transition-opacity hover:opacity-90 max-sm:!px-3"
            aria-label="Login with Discord"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02C1.9 9.4 1.15 13.36 1.52 17.28c0 .02.01.04.03.05a16.2 16.2 0 0 0 4.85 2.45.06.06 0 0 0 .07-.02c.37-.51.7-1.05.99-1.61.02-.04 0-.08-.04-.09-.53-.2-1.03-.44-1.51-.72-.04-.02-.04-.08-.01-.11.1-.08.2-.16.3-.23a.06.06 0 0 1 .06-.01c3.17 1.45 6.6 1.45 9.73 0a.06.06 0 0 1 .07.01c.1.08.2.16.3.24.04.02.03.09-.01.11-.48.28-.98.52-1.51.72-.04.01-.05.05-.04.09.3.56.63 1.1.99 1.61a.06.06 0 0 0 .07.02 16.15 16.15 0 0 0 4.86-2.45.05.05 0 0 0 .02-.05c.44-4.53-.73-8.46-3.1-11.93a.04.04 0 0 0-.02-.02zM8.52 14.91c-.95 0-1.74-.88-1.74-1.96s.77-1.96 1.74-1.96c.98 0 1.76.89 1.74 1.96 0 1.08-.77 1.96-1.74 1.96zm6.97 0c-.95 0-1.74-.88-1.74-1.96s.77-1.96 1.74-1.96c.98 0 1.76.89 1.74 1.96 0 1.08-.76 1.96-1.74 1.96z" />
            </svg>
            <span className="max-sm:hidden">Login</span>
          </a>
          <button
            onClick={openReferralModal}
            className="m3-btn-tonal !h-10 !px-4 !text-[14px] max-md:hidden"
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
