"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { NAV_ICONS } from "@/components/dashboard/NavIcons";

type NavItem = { label: string; href: string; icon: string; soon?: boolean };

// Grouped navigation — only tools we actually have. `icon` = key into NAV_ICONS.
const NAV_SECTIONS: { heading?: string; items: NavItem[] }[] = [
  {
    heading: "Research",
    items: [
      { label: "Discover", href: "/dashboard", icon: "discover" },
      { label: "Explore", href: "/dashboard/explore", icon: "explore" },
      { label: "Niche Researcher", href: "/dashboard/niche-researcher", icon: "niche" },
    ],
  },
  {
    heading: "Create",
    items: [{ label: "Script Generator", href: "/dashboard/script-generator", icon: "script" }],
  },
  {
    heading: "Analyze",
    items: [
      { label: "Trust Score", href: "/dashboard/trust-score", icon: "trust" },
      { label: "Channel Audit", href: "/dashboard/channel-audit", icon: "audit" },
      { label: "Shorts Transcript", href: "/dashboard/shorts-transcript", icon: "transcript" },
    ],
  },
];

const SETTINGS_ICON = "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z";

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// Time until the next daily discovery refresh (Vercel cron: 05:00 UTC).
function refreshCountdown(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  const ms = next.getTime() - now.getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Which nav href is "active" for the current path. Discover shares /dashboard
// with Overview, so we treat the exact /dashboard as Overview.
function isActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

// Page title shown in the topbar.
const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Discover",
  "/dashboard/explore": "Explore",
  "/dashboard/niche-researcher": "Niche Researcher",
  "/dashboard/script-generator": "Script Generator",
  "/dashboard/trust-score": "Trust Score",
  "/dashboard/channel-audit": "Channel Audit",
  "/dashboard/shorts-transcript": "Shorts Transcript",
  "/dashboard/settings": "Settings",
};
function pageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const hit = Object.keys(PAGE_TITLES).find((h) => h !== "/dashboard" && pathname.startsWith(h));
  return hit ? PAGE_TITLES[hit] : "Discover";
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [countdown, setCountdown] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => {
    setCountdown(refreshCountdown());
    const t = setInterval(() => setCountdown(refreshCountdown()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#151416]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#0FA5E9]" />
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "Creator";
  const avatar = user.photoURL;

  const NavLinks = () => (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4 pt-2">
      {NAV_SECTIONS.map((section, si) => (
        <div key={section.heading ?? si}>
          {section.heading && (
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
              {section.heading}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {section.items.map((item) => {
              const active = isActive(item.href, pathname);
              const IconCmp = NAV_ICONS[item.icon];
              const cls = `group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-3 text-[14.5px] transition-all duration-200 ${
                active ? "font-semibold text-white" : "font-medium text-white/55 hover:text-white"
              } ${item.soon ? "cursor-default opacity-40" : ""}`;
              const inner = (
                <>
                  {active ? (
                    <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#0FA5E9]/[0.18] to-[#0FA5E9]/[0.04] ring-1 ring-inset ring-[#0FA5E9]/20" />
                  ) : (
                    <span className="absolute inset-0 scale-95 rounded-lg bg-white/[0.05] opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100" />
                  )}
                  {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#0FA5E9] shadow-[0_0_8px_rgba(15,165,233,0.7)]" />}
                  {/* animated icon: cyan when active, animates on hover */}
                  <span className={`relative shrink-0 ${active ? "text-[#0FA5E9]" : "text-white/50 group-hover:text-white/90"}`}>
                    {IconCmp ? <IconCmp /> : null}
                  </span>
                  <span className="relative flex-1 truncate whitespace-nowrap transition-transform duration-200 group-hover:translate-x-0.5">{item.label}</span>
                  {item.soon && (
                    <span className="relative shrink-0 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-semibold text-white/50">Soon</span>
                  )}
                </>
              );
              return item.soon ? (
                <div key={item.label} className={cls}>{inner}</div>
              ) : (
                <Link key={item.label} href={item.href} onClick={() => setSidebarOpen(false)} className={cls}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="dashboard-dark flex min-h-screen bg-[#151416]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 transform flex-col overflow-x-hidden border-r border-white/[0.06] bg-[#0D0D11] transition-transform duration-200 md:sticky md:top-0 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-heading text-[18px] font-bold text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.webp" alt="" width={28} height={28} className="shrink-0 rounded-lg" />
            NicheSpy
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.06] md:hidden"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <NavLinks />

        {/* Bottom: settings + logout */}
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <Link href="/dashboard/settings" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white/90">
            <span className="text-white/45"><Icon d={SETTINGS_ICON} size={17} /></span>
            Settings
          </Link>
          <button
            onClick={async () => { await signOut(); router.replace("/login"); }}
            className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white/90"
          >
            <span className="text-white/45"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg></span>
            Log out
          </button>
        </div>
      </aside>

      {/* mobile backdrop */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main column */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Ambient background depth */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#0FA5E9]/[0.06] blur-[120px]" />
          <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-[#0FA5E9]/[0.03] blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.6]"
            style={{
              backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              maskImage: "radial-gradient(ellipse 100% 60% at 50% 0%, #000 40%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 100% 60% at 50% 0%, #000 40%, transparent 100%)",
            }}
          />
        </div>

        {/* Top row — no bar (transparent, no border/background), items just float. */}
        <header className="pointer-events-none sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between px-4 md:px-7 [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_span]:pointer-events-auto">
          <div className="flex items-center gap-3">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#151416]/80 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/[0.06] md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </button>
            {/* Page title in the topbar. Hidden on desktop only for Explore
                (its filter rail occupies that top-left spot). */}
            <h1 className={`font-heading text-[22px] font-bold tracking-[-0.01em] text-white ${pathname.startsWith("/dashboard/explore") ? "md:hidden" : ""}`}>{pageTitle(pathname)}</h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Refresh countdown */}
            {countdown && (
              <span className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-[#1a1a20]/90 px-3.5 py-2 text-[13px] font-medium text-white/60 backdrop-blur-md sm:inline-flex">
                <span className="text-[#0FA5E9]"><Icon d="M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" size={15} /></span>
                Discovery refresh in <span className="font-semibold text-[#4fc3f7]">{countdown}</span>
              </span>
            )}

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#1a1a20]/90 py-1 pl-1 pr-2.5 backdrop-blur-md transition-colors hover:bg-white/[0.08]"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0FA5E9] text-[14px] font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-[13.5px] font-semibold text-white/90 max-sm:hidden">{displayName}</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/45 max-sm:hidden"><path d="m6 9 6 6 6-6" /></svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1A1A20] shadow-[0_16px_50px_rgba(0,0,0,0.6)]">
                  <div className="border-b border-white/[0.06] px-4 py-3">
                    <div className="truncate text-[14px] font-semibold text-white">{displayName}</div>
                    <div className="truncate text-[12px] text-white/45">{user.email}</div>
                  </div>
                  <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white">
                    <Icon d={SETTINGS_ICON} size={15} /> Settings
                  </Link>
                  <button
                    onClick={async () => { await signOut(); router.replace("/login"); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-[#ff6b6b] transition-colors hover:bg-[#ff6b6b]/10"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="dashboard-zoom relative flex-1 p-4 text-white md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
