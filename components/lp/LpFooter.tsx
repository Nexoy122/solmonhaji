import Link from "next/link";
import { LpSignupButton } from "./LpSignupButton";

const SUPPORT_EMAIL = "support@vixo.live";
const DISCORD_INVITE = "https://discord.gg/7AYW4693XQ";
const INSTAGRAM = "https://www.instagram.com/nichespy.live/";

const PRODUCT = [
  { label: "Discover", href: "#tools" },
  { label: "Explore", href: "#tools" },
  { label: "Niche Researcher", href: "#tools" },
  { label: "Script Generator", href: "#tools" },
  { label: "Trust Score", href: "#tools" },
];

const RESOURCES = [
  { label: "Tools", href: "#tools" },
  { label: "How it works", href: "#how" },
  { label: "FAQ", href: "#faq" },
  { label: "Discord community", href: DISCORD_INVITE, external: true },
];

export function LpFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#0b0f18]">
      <div className="mx-auto max-w-[1180px] px-5 md:px-8 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          {/* Brand + blurb */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 font-heading text-[20px] font-bold text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.webp" alt="" width={30} height={30} className="rounded-lg" />
              NicheSpy
            </div>
            <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-white/50">
              The competitor-intelligence workspace for YouTube creators. Spy on your niche,
              find what works, and grow faster — without the spreadsheet grind.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#5865F2] px-4 py-2 text-[14px] font-semibold text-white transition-transform hover:-translate-y-px active:scale-95"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.05a19.909 19.909 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Join the community
              </a>
              <a
                href={INSTAGRAM}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow NicheSpy on Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/60 transition-all hover:-translate-y-px hover:border-[#01D4FF] hover:text-[#01D4FF] active:scale-95"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-white/40">Tools</h4>
            <ul className="flex flex-col gap-3">
              {PRODUCT.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-[15px] text-white/55 transition-colors hover:text-[#01D4FF]">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-white/40">Resources</h4>
            <ul className="flex flex-col gap-3">
              {RESOURCES.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target={l.external ? "_blank" : undefined}
                    rel={l.external ? "noopener noreferrer" : undefined}
                    className="text-[15px] text-white/55 transition-colors hover:text-[#01D4FF]"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-white/40">Get started</h4>
            <p className="mb-4 text-[15px] leading-relaxed text-white/55">
              Sign up free and unlock every live tool during beta.
            </p>
            <LpSignupButton size="md" label="Get Started Free" />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] pt-7 text-center md:flex-row md:text-left">
          <p className="text-[14px] text-white/45">
            © {new Date().getFullYear()} NicheSpy — Built for creators who want the edge.
          </p>
          <div className="flex items-center gap-6 text-[14px] text-white/45">
            <Link href="/privacy" className="transition-colors hover:text-[#01D4FF]">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-[#01D4FF]">Terms</Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="transition-colors hover:text-[#01D4FF]">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
