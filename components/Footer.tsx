import Link from "next/link";
import { Logo } from "./Navbar";

const SUPPORT_EMAIL = "support@vixo.live";
const DISCORD_INVITE = "https://discord.gg/7AYW4693XQ";
// Opens Gmail compose if the user uses Gmail in-browser; falls back to mailto.
const GMAIL_COMPOSE = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}&su=${encodeURIComponent(
  "NicheSpy — Support"
)}`;

const PRODUCT = [
  { label: "Competitor Finder", href: "#features" },
  { label: "Outlier Detector", href: "#features" },
  { label: "Gap Finder", href: "#features" },
  { label: "Viral Alerts", href: "#features" },
  { label: "Trust Score (soon)", href: "#features" },
];

const RESOURCES = [
  { label: "How it works", href: "#how" },
  { label: "FAQ", href: "#faq" },
  { label: "Join the waitlist", href: "#top" },
  { label: "Discord community", href: DISCORD_INVITE, external: true },
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-outline-variant bg-surface-container-low">
      <div className="mx-auto max-w-[1180px] px-5 md:px-8 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          {/* Brand + blurb */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 text-[20px] font-bold">
              <Logo size={30} />
              NicheSpy
            </div>
            <p className="mt-4 max-w-[300px] text-body-medium text-on-surface-variant">
              The competitor-intelligence workspace for YouTube creators. Spy on your niche,
              find what works, and grow faster — without the spreadsheet grind.
            </p>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#5865F2] px-4 py-2 text-[14px] font-semibold text-white transition-transform hover:-translate-y-px active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.05a19.909 19.909 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Join the community
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-on-surface-variant">Product</h4>
            <ul className="flex flex-col gap-3">
              {PRODUCT.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-body-medium text-on-surface-variant transition-colors hover:text-primary">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-on-surface-variant">Resources</h4>
            <ul className="flex flex-col gap-3">
              {RESOURCES.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target={l.external ? "_blank" : undefined}
                    rel={l.external ? "noopener noreferrer" : undefined}
                    className="text-body-medium text-on-surface-variant transition-colors hover:text-primary"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-on-surface-variant">Get in touch</h4>
            <p className="mb-4 text-body-medium text-on-surface-variant">
              Questions, feedback, or partnership ideas? We&apos;d love to hear from you.
            </p>
            <a href={GMAIL_COMPOSE} target="_blank" rel="noopener noreferrer" className="m3-btn-filled !h-11 !px-5 !text-[14px]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 6L2 7" />
              </svg>
              Contact Us
            </a>
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-outline-variant pt-7 text-center md:flex-row md:text-left">
          <p className="text-[14px] text-on-surface-variant">
            © {new Date().getFullYear()} NicheSpy — Built for creators who want the edge.
          </p>
          <div className="flex items-center gap-6 text-[14px] text-on-surface-variant">
            <Link href="/privacy" className="transition-colors hover:text-primary">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-primary">Terms</Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="transition-colors hover:text-primary">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
