"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { NAV_ICONS, MSym } from "@/components/dashboard/NavIcons";
import { refreshCountdownLabel } from "@/lib/refreshSchedule";

type NavItem = { label: string; href: string; icon: string; soon?: boolean };

// Product updates / changelog. Newest first — add a new entry at the top when
// something ships. The top entry's `id` drives the "unseen" dot. `points` are
// the detailed bullets shown in the full Updates modal.
type Update = { id: string; date: string; tag: "New" | "Improved" | "Fixed"; title: string; body: string; points: string[] };
const UPDATES: Update[] = [
  {
    id: "2026-07-14-bauhaus",
    date: "July 14, 2026",
    tag: "New",
    title: "A brand-new look",
    body: "NicheSpy has a bold new Bauhaus design across the whole app — landing, dashboard, and every tool.",
    points: [
      "Constructivist Bauhaus theme: primary colors, thick borders, hard shadows.",
      "New Outfit typeface and uppercase headings throughout.",
      "Redesigned landing page, login/signup, and legal pages.",
      "Every dashboard tool restyled to match.",
    ],
  },
  {
    id: "2026-07-12-plans",
    date: "July 12, 2026",
    tag: "New",
    title: "Plans & billing",
    body: "Upgrade to Starter, Creator, or Plus right from the dashboard, with secure checkout.",
    points: [
      "Three plans — Starter ($9), Creator ($19), Plus ($39).",
      "Every plan includes every tool; you scale credits, channels & support.",
      "Manage or cancel your subscription anytime from the billing portal.",
      "Launch offer: 50% off for early members.",
    ],
  },
  {
    id: "2026-07-10-trust",
    date: "July 10, 2026",
    tag: "Improved",
    title: "Trust Score accuracy",
    body: "Trust Score is now tuned specifically for Shorts, with clearer breakdowns and a shareable card.",
    points: [
      "Shorts-specific retention & completion scoring.",
      "Automatic niche detection for fairer benchmarks.",
      "Confidence rating based on real data completeness.",
      "Download or copy a shareable Trust Score image.",
    ],
  },
];
const UPDATE_TAG_COLOR: Record<string, string> = { New: "#D02020", Improved: "#1040C0", Fixed: "#F0C020" };

// Grouped navigation. `icon` = key into NAV_ICONS, or a raw Material Symbol name.
// `soon: true` items are coming-soon (disabled, badged).
const NAV_SECTIONS: { heading?: string; items: NavItem[] }[] = [
  {
    heading: "Research",
    items: [
      { label: "Discover", href: "/dashboard", icon: "discover" },
      { label: "Explore", href: "/dashboard/explore", icon: "explore" },
      { label: "Niche Researcher", href: "/dashboard/niche-researcher", icon: "niche" },
      { label: "Study Channels", href: "#", icon: "travel_explore", soon: true },
      { label: "My Channels", href: "#", icon: "subscriptions", soon: true },
    ],
  },
  {
    heading: "Create",
    items: [
      { label: "Script Generator", href: "/dashboard/script-generator", icon: "script" },
      { label: "Voiceovers", href: "#", icon: "record_voice_over", soon: true },
      { label: "Editor", href: "#", icon: "movie_edit", soon: true },
      { label: "Clipper", href: "#", icon: "content_cut", soon: true },
      { label: "Captions Generator", href: "#", icon: "closed_caption", soon: true },
      { label: "Image Generator", href: "#", icon: "image", soon: true },
    ],
  },
  {
    heading: "Analyze",
    items: [
      { label: "Trust Score", href: "/dashboard/trust-score", icon: "trust" },
      { label: "Channel Audit", href: "#", icon: "audit", soon: true },
      { label: "Shorts Transcript", href: "/dashboard/shorts-transcript", icon: "transcript" },
      { label: "Revenue Calculator", href: "#", icon: "payments", soon: true },
      { label: "Pre/Post Check", href: "#", icon: "checklist", soon: true },
    ],
  },
  {
    heading: "Utilities",
    items: [
      { label: "Video Downloader", href: "#", icon: "download", soon: true },
      { label: "Video Upscaler", href: "#", icon: "high_quality", soon: true },
      { label: "Captions Remover", href: "#", icon: "subtitles_off", soon: true },
      { label: "Background Remover", href: "#", icon: "background_replace", soon: true },
    ],
  },
];

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
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
  "/dashboard/niche-researcher": "Niche Research",
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
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [updatesModalOpen, setUpdatesModalOpen] = useState(false);
  const [unseen, setUnseen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  // Load the credit balance (and refresh it when the tab regains focus / after
  // a tool run signals via the "credits:changed" event).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = await user?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/credits", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!cancelled && typeof data.balance === "number" && data.balance >= 0) setCredits(data.balance);
      } catch { /* ignore */ }
    };
    load();
    const onChange = () => load();
    window.addEventListener("credits:changed", onChange);
    window.addEventListener("focus", onChange);
    return () => { cancelled = true; window.removeEventListener("credits:changed", onChange); window.removeEventListener("focus", onChange); };
  }, [user]);
  const menuRef = useRef<HTMLDivElement>(null);
  const updatesRef = useRef<HTMLDivElement>(null);

  // Mark updates as seen when the panel opens (persist the latest-seen id).
  useEffect(() => {
    try {
      const seen = localStorage.getItem("ns_updates_seen");
      setUnseen(seen !== UPDATES[0]?.id);
    } catch { /* ignore */ }
  }, []);
  const openUpdates = () => {
    setUpdatesOpen((o) => !o);
    setUnseen(false);
    try { localStorage.setItem("ns_updates_seen", UPDATES[0]?.id ?? ""); } catch { /* ignore */ }
  };
  useEffect(() => {
    if (!updatesOpen) return;
    const onClick = (e: MouseEvent) => {
      if (updatesRef.current && !updatesRef.current.contains(e.target as Node)) setUpdatesOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [updatesOpen]);

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
    setCountdown(refreshCountdownLabel());
    const t = setInterval(() => setCountdown(refreshCountdownLabel()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F0F0]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-[#D02020]" />
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
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">
              {section.heading}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {section.items.map((item) => {
              const active = isActive(item.href, pathname);
              const IconCmp = NAV_ICONS[item.icon];
              const cls = `group relative flex items-center gap-3 overflow-hidden border-2 px-3 py-2.5 text-[14px] font-bold uppercase tracking-tight transition-all duration-200 ${
                active ? "border-black bg-[#D02020] text-white shadow-[3px_3px_0px_0px_#121212]" : "border-transparent text-black/70 hover:border-black hover:bg-white hover:text-black"
              } ${item.soon ? "cursor-default opacity-40" : ""}`;
              const inner = (
                <>
                  {/* icon â€” white/muted (no cyan), vertically centered with text.
                      Named keys use NAV_ICONS; otherwise treat `icon` as a raw
                      Material Symbol glyph name. */}
                  <span className={`relative flex shrink-0 items-center ${active ? "text-white" : "text-black/70 group-hover:text-black"}`}>
                    {IconCmp ? <IconCmp /> : <MSym name={item.icon} />}
                  </span>
                  <span className="relative flex-1 truncate whitespace-nowrap leading-none">{item.label}</span>
                  {item.soon && (
                    <span className="relative shrink-0 border border-black bg-[#F0C020] px-1.5 py-0.5 text-[9px] font-black uppercase text-black">Soon</span>
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
    <div className="dashboard-dark flex h-screen overflow-hidden bg-[#F0F0F0]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 transform flex-col overflow-x-hidden border-r-4 border-black bg-[#F0F0F0] transition-transform duration-200 md:sticky md:top-0 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b-4 border-black px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5 text-[18px] font-black uppercase tracking-tighter text-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.webp" alt="" width={28} height={28} className="shrink-0 rounded-lg" />
            NicheSpy
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-black/50 transition-colors hover:bg-[#E0E0E0] md:hidden"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <NavLinks />

        {/* Bottom: upgrade + settings + logout */}
        <div className="shrink-0 border-t border-black p-3">
          <Link href="/dashboard/plans" onClick={() => setSidebarOpen(false)} className="mb-1 flex items-center gap-3 rounded-lg border border-[#D02020]/30 bg-[#D02020]/10 px-3 py-2.5 text-[14px] font-semibold text-[#D02020] transition-colors hover:bg-[#D02020]/20">
            <span className="flex items-center"><MSym name="bolt" size={20} /></span>
            Upgrade plan
          </Link>
          <Link href="/dashboard/settings" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-black/70 transition-colors hover:bg-[#E0E0E0] hover:text-black">
            <span className="flex items-center text-black/50"><MSym name="settings" size={20} /></span>
            Settings
          </Link>
          <button
            onClick={async () => { await signOut(); router.replace("/login"); }}
            className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-black/70 transition-colors hover:bg-[#E0E0E0] hover:text-black"
          >
            <span className="flex items-center text-black/50"><MSym name="logout" size={20} /></span>
            Log out
          </button>
        </div>
      </aside>

      {/* mobile backdrop */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-white/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main column: a fixed header row + a scrolling <main>. Only <main>
          scrolls, so the header physically cannot move. */}
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-50 flex h-16 shrink-0 items-center justify-between border-b-4 border-black bg-[#F0F0F0] px-4 md:px-7">
          <div className="flex items-center gap-3">
            <button
              className="flex h-10 w-10 items-center justify-center border-2 border-black bg-white text-black shadow-[3px_3px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </button>
            <h1 className="text-[24px] font-black uppercase tracking-tighter text-black">{pageTitle(pathname)}</h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Refresh countdown — yellow Bauhaus tag */}
            {countdown && (
              <span className="hidden items-center gap-2 border-2 border-black bg-[#F0C020] px-3 py-1.5 text-[12px] font-black uppercase tracking-wide text-black sm:inline-flex">
                <Icon d="M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" size={14} />
                Refresh in {countdown}
              </span>
            )}

            {/* Credits balance — Bauhaus pill with a lightning SVG, links to plans */}
            {credits !== null && (
              <Link
                href="/dashboard/plans"
                title="Credits — click to get more"
                className="inline-flex items-center gap-1.5 border-2 border-black bg-[#F0C020] px-3 py-1.5 shadow-[3px_3px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#121212" aria-hidden><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" /></svg>
                <span className="text-[13px] font-black uppercase tracking-wide text-black tabular-nums">{credits.toLocaleString()}</span>
              </Link>
            )}

            {/* Updates — "Updates" button that opens the full modal */}
            <button
              onClick={() => { setUpdatesModalOpen(true); setUnseen(false); try { localStorage.setItem("ns_updates_seen", UPDATES[0]?.id ?? ""); } catch { /* ignore */ } }}
              className="hidden items-center gap-2 border-2 border-black bg-white px-3 py-2 text-[12px] font-black uppercase tracking-wide text-black shadow-[3px_3px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none sm:inline-flex"
            >
              <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 16v-4M12 8h.01" size={15} />
              Updates
            </button>

            {/* Updates — bell button + quick dropdown */}
            <div className="relative" ref={updatesRef}>
              <button
                onClick={openUpdates}
                aria-label="Updates"
                className="relative flex size-10 items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <Icon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" size={18} />
                {unseen && <span className="absolute -right-1 -top-1 h-3 w-3 border-2 border-black bg-[#D02020]" />}
              </button>

              {updatesOpen && (
                <div className="absolute right-0 z-50 mt-2 w-80 border-2 border-black bg-white shadow-[6px_6px_0px_0px_#121212]">
                  <div className="flex items-center justify-between border-b-2 border-black bg-[#F0C020] px-4 py-2.5">
                    <span className="text-[14px] font-black uppercase tracking-tight text-black">What&apos;s new</span>
                    <span className="border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase text-black">{UPDATES.length}</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y-2 divide-black">
                    {UPDATES.map((u) => (
                      <div key={u.id} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="border-2 border-black px-1.5 py-0.5 text-[9px] font-black uppercase text-white" style={{ background: UPDATE_TAG_COLOR[u.tag] }}>{u.tag}</span>
                          <span className="text-[11px] font-bold uppercase tracking-wide text-black/50">{u.date}</span>
                        </div>
                        <p className="mt-1.5 text-[14px] font-black uppercase tracking-tight text-black">{u.title}</p>
                        <p className="mt-0.5 text-[13px] font-medium leading-snug text-black/70">{u.body}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setUpdatesOpen(false); setUpdatesModalOpen(true); }}
                    className="w-full border-t-2 border-black bg-[#D02020] py-2.5 text-[12px] font-black uppercase tracking-widest text-white transition-colors hover:brightness-95"
                  >
                    View all updates →
                  </button>
                </div>
              )}
            </div>

            {/* User menu — avatar with hard border */}
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen((o) => !o)} aria-label="Account menu" className="flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-black p-0 shadow-[2px_2px_0px_0px_#121212]">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" width={40} height={40} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-[#E0E0E0] text-[15px] font-bold text-black">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-black bg-[#F0F0F0]">
                  <div className="border-b border-black px-4 py-3">
                    <div className="truncate text-[14px] font-semibold text-black">{displayName}</div>
                    <div className="truncate text-[12px] text-black/50">{user.email}</div>
                  </div>
                  <Link href="/dashboard/plans" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-[#D02020] transition-colors hover:bg-[#D02020]/10">
                    <MSym name="bolt" size={18} /> Upgrade plan
                  </Link>
                  <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-black/70 transition-colors hover:bg-[#E0E0E0] hover:text-black">
                    <MSym name="settings" size={18} /> Settings
                  </Link>
                  <button
                    onClick={async () => { await signOut(); router.replace("/login"); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-[#ff6b6b] transition-colors hover:bg-[#ff6b6b]/10"
                  >
                    <MSym name="logout" size={18} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Only this scrolls â€” the header above stays put. */}
        <main className="dashboard-zoom relative flex-1 overflow-y-auto p-4 text-black md:p-6 lg:p-8">{children}</main>
      </div>

      {/* ── Updates modal — full detailed changelog ── */}
      {updatesModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setUpdatesModalOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col border-4 border-black bg-white shadow-[10px_10px_0px_0px_#121212]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex shrink-0 items-center justify-between border-b-4 border-black bg-[#F0C020] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-[#D02020]">
                  <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 16v-4M12 8h.01" size={16} />
                </span>
                <h2 className="text-[22px] font-black uppercase tracking-tighter text-black">What&apos;s new</h2>
              </div>
              <button
                onClick={() => setUpdatesModalOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <Icon d="M18 6 6 18M6 6l12 12" size={18} />
              </button>
            </div>

            {/* body — detailed entries */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {UPDATES.map((u) => (
                  <div key={u.id} className="border-2 border-black bg-white p-5 shadow-[5px_5px_0px_0px_#121212]">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: UPDATE_TAG_COLOR[u.tag] }}>{u.tag}</span>
                      <span className="text-[12px] font-bold uppercase tracking-wide text-black/50">{u.date}</span>
                    </div>
                    <h3 className="mt-3 text-[20px] font-black uppercase tracking-tight text-black">{u.title}</h3>
                    <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-black/70">{u.body}</p>
                    <ul className="mt-4 space-y-2">
                      {u.points.map((p) => (
                        <li key={p} className="flex items-start gap-2.5 text-[14px] font-medium text-black">
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 border-2 border-black" style={{ background: UPDATE_TAG_COLOR[u.tag] }} />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
