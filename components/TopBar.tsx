"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";

const DISCORD_INVITE = "https://discord.gg/7AYW4693XQ";
const STRAP_H = 40; // px

export function TopBar() {
  const [strapOpen, setStrapOpen] = useState(true);

  return (
    <>
      {strapOpen && (
        <div className="fixed inset-x-0 top-0 z-[120] bg-primary text-on-primary" style={{ height: STRAP_H }}>
          <div className="relative mx-auto flex h-full max-w-[1180px] items-center justify-center gap-3 px-10 md:px-8">
            <span className="flex items-center gap-2 text-[14px] font-medium">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.05a19.909 19.909 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              <span className="hidden sm:inline">Join our Discord for early access &amp; updates</span>
              <span className="sm:hidden">Join our Discord</span>
            </span>

            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full bg-on-primary px-4 py-1 text-[13px] font-bold text-primary transition-transform hover:-translate-y-px active:scale-95"
            >
              Join now →
            </a>

            <button
              onClick={() => setStrapOpen(false)}
              aria-label="Dismiss announcement"
              className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full text-on-primary/80 transition-colors hover:bg-white/15 hover:text-on-primary md:right-2"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <Navbar topOffset={strapOpen ? STRAP_H : 0} />
    </>
  );
}
