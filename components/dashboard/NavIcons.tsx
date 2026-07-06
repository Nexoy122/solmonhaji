"use client";

// Animated nav icons. Each animates on the parent link's hover (via the
// `group` class on the <Link>) — a distinct motion per icon. `active` tints cyan.

const base = "transition-all duration-300 ease-out";

function Svg({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

// Overview: house — roof lifts slightly on hover.
export function OverviewIcon() {
  return (
    <Svg>
      <path className={`${base} origin-bottom group-hover:-translate-y-0.5`} d="M3 12l9-9 9 9" />
      <path d="M5 10v10h14V10" />
    </Svg>
  );
}

// Discover: compass — needle spins on hover.
export function DiscoverIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="10" />
      <path className={`${base} origin-center group-hover:rotate-[120deg]`} d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z" />
    </Svg>
  );
}

// Explore: magnifier — lens nudges out on hover.
export function ExploreIcon() {
  return (
    <Svg>
      <circle className={`${base} group-hover:-translate-x-0.5 group-hover:-translate-y-0.5`} cx="11" cy="11" r="7" />
      <path className={`${base} group-hover:translate-x-0.5 group-hover:translate-y-0.5`} d="M21 21l-4.3-4.3" />
    </Svg>
  );
}

// Niche Researcher: search + spark — spark twinkles.
export function NicheIcon() {
  return (
    <Svg>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
      <path className={`${base} origin-center group-hover:rotate-90 group-hover:scale-110`} d="M11 8v6M8 11h6" />
    </Svg>
  );
}

// Script Generator: pen — writes (nib dips) on hover.
export function ScriptIcon() {
  return (
    <Svg>
      <path d="M12 20h9" />
      <path className={`${base} origin-bottom-left group-hover:translate-x-0.5 group-hover:-translate-y-0.5`} d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  );
}

// Trust Score: shield — check draws in on hover.
export function TrustIcon() {
  return (
    <Svg>
      <path d="M12 2l8 4v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-4z" />
      <path className={`${base} [stroke-dasharray:12] group-hover:[stroke-dashoffset:0] [stroke-dashoffset:12]`} d="M9 12l2 2 4-4" />
    </Svg>
  );
}

// Channel Audit: checklist — check pops on hover.
export function AuditIcon() {
  return (
    <Svg>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      <path className={`${base} origin-center group-hover:scale-125`} d="M9 11l3 3L22 4" />
    </Svg>
  );
}

// Shorts Transcript: text lines — underline slides in.
export function TranscriptIcon() {
  return (
    <Svg>
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </Svg>
  );
}

export const NAV_ICONS: Record<string, () => React.ReactElement> = {
  overview: OverviewIcon,
  discover: DiscoverIcon,
  explore: ExploreIcon,
  niche: NicheIcon,
  script: ScriptIcon,
  trust: TrustIcon,
  audit: AuditIcon,
  transcript: TranscriptIcon,
};
