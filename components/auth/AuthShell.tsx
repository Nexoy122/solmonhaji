"use client";

import { useState } from "react";
import Link from "next/link";
import { BhLogoMark } from "@/components/lp/bauhaus/BhKit";

// ── Bauhaus auth theme, constructivist, geometric, primary colors, hard
//    offset shadows, Outfit typeface. Scoped via .lp-root on the page shell. ──
export const AUTH_DARK = {
  page: "#F0F0F0",
  panel: "#1040C0",
  card: "#FFFFFF",
  border: "#121212",
  text: "#121212",
  muted: "#5A5A5A",
  accent: "#D02020",
};

// Real Shorts footage for the left panel, mirroring the landing hero's deck.
const AUTH_DECK = [
  { video: "/niches/edits.mp4", poster: "/niches/edits.jpg", outlier: "47×", views: "12M", rotate: -5 },
  { video: "/niches/memes.mp4", poster: "/niches/memes.jpg", outlier: "12×", views: "4.2M", rotate: 3 },
  { video: "/niches/gaming.mp4", poster: "/niches/gaming.jpg", outlier: "8×", views: "890K", rotate: -2 },
];

// Split-screen auth: an outlier Shorts feed on the left, a hard-bordered white
// form card on an off-white dot-grid canvas on the right.
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="lp-root relative flex min-h-screen bg-[#F0F0F0] text-[#121212]">
      {/* Left: an outlier Shorts feed, the same motif as the landing hero, so the
          page reads as a YouTube tool rather than an abstract design exercise. */}
      <aside className="relative hidden w-[46%] overflow-hidden border-r-4 border-black bg-[#0F0F0F] bh-dots-light lg:flex lg:flex-col lg:justify-between lg:p-10">
        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <BhLogoMark size={30} />
          <span className="text-[22px] font-black uppercase tracking-tighter text-white">NicheSpy</span>
        </Link>

        {/* "found outliers" chip, sells that this is a live product */}
        <div className="relative z-10 mt-8 inline-flex w-fit items-center gap-2 border-2 border-black bg-[#F0C020] px-3 py-1.5 shadow-[3px_3px_0_0_#000]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF0033]" />
          <span className="text-[11.5px] font-black uppercase tracking-wide text-black">
            3 outliers found this week
          </span>
        </div>

        {/* fanned deck of real Shorts */}
        <div className="relative z-10 flex flex-1 items-center justify-center gap-3">
          {AUTH_DECK.map((s, i) => (
            <div key={s.video} className={i === 1 ? "w-[34%] -translate-y-5" : "w-[30%]"}>
              <div
                className="relative border-2 border-black bg-[#161616] shadow-[6px_6px_0px_0px_#000]"
                style={{ transform: `rotate(${s.rotate}deg)` }}
              >
                <div className="relative aspect-[9/16] overflow-hidden border-b-2 border-black">
                  <video
                    src={s.video}
                    poster={s.poster}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="none"
                    aria-hidden
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 bg-black/20" />
                  <span className="absolute left-1.5 top-1.5 border-2 border-black bg-[#F0C020] px-1.5 py-0.5 text-[9.5px] font-black uppercase leading-none tracking-wide text-black">
                    {s.outlier}
                  </span>
                  <span className="absolute bottom-1.5 left-1.5 bg-black/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                    ▶ {s.views}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="relative z-10 max-w-xs text-[16px] font-bold uppercase leading-tight tracking-tight text-white">
          Spy on what actually works, grow your Shorts faster.
        </p>
      </aside>

      {/* Right: form panel on dot-grid */}
      <section className="relative flex flex-1 items-center justify-center bh-dots px-4 py-8 sm:px-5 sm:py-10">
        <div className="w-full max-w-[440px]">
          {/* logo on mobile */}
          <Link href="/" className="mb-7 flex items-center justify-center gap-2.5 lg:hidden">
            <BhLogoMark size={28} />
            <span className="text-[22px] font-black uppercase tracking-tighter text-black">NicheSpy</span>
          </Link>

          {/* form card, hard border + offset shadow */}
          <div className="border-2 border-black bg-white p-7 shadow-[8px_8px_0px_0px_#121212] sm:p-8 md:border-4">
            <span className="inline-block h-6 w-6 border-2 border-black bg-[#D02020]" />
            <h1 className="mt-4 text-[30px] font-black uppercase leading-[0.95] tracking-tighter text-black sm:text-[34px]">{title}</h1>
            <p className="mt-2 text-[14.5px] font-medium text-black/60">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>

          <p className="mt-6 text-center text-[14px] font-medium text-black/60">{footer}</p>
        </div>
      </section>
    </main>
  );
}

export function GoogleButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-3 border-2 border-black bg-white text-[15px] font-bold uppercase tracking-wide text-black shadow-[4px_4px_0px_0px_#121212] transition-all duration-200 ease-out hover:bg-[#F0F0F0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C39.9 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z" />
      </svg>
      {label}
    </button>
  );
}

export function AuthInput({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-bold uppercase tracking-widest text-black">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-12 border-2 border-black bg-white px-4 text-[15px] font-medium text-black outline-none transition-all placeholder:text-black/35 focus:shadow-[3px_3px_0px_0px_#1040C0]"
      />
    </label>
  );
}

// ── Password strength (0–4) from length + character variety ──
export function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}
const STRENGTH = [
  { label: "", color: "" },
  { label: "Weak", color: "#D02020" },
  { label: "Fair", color: "#F0C020" },
  { label: "Good", color: "#1040C0" },
  { label: "Strong", color: "#118A3E" },
];

// Password field with a show/hide eye. `showStrength` adds a live meter.
export function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  showStrength = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean;
}) {
  const [reveal, setReveal] = useState(false);
  const score = showStrength ? passwordStrength(value) : 0;
  const meta = STRENGTH[score];
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-bold uppercase tracking-widest text-black">{label}</span>
      <div className="relative">
        <input
          type={reveal ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-12 w-full border-2 border-black bg-white px-4 pr-11 text-[15px] font-medium text-black outline-none transition-all placeholder:text-black/35 focus:shadow-[3px_3px_0px_0px_#1040C0]"
        />
        <button
          type="button"
          onClick={() => setReveal((r) => !r)}
          tabIndex={-1}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center text-black/50 transition-colors hover:text-black"
        >
          {reveal ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="mt-1 flex items-center gap-2.5">
          <div className="flex flex-1 gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-2 flex-1 border-2 border-black transition-colors"
                style={{ backgroundColor: i <= score ? meta.color : "#FFFFFF" }}
              />
            ))}
          </div>
          <span className="w-[52px] shrink-0 text-right text-[11px] font-black uppercase tracking-wide" style={{ color: meta.color || "#999" }}>
            {meta.label}
          </span>
        </div>
      )}
    </label>
  );
}

// Divider ("or") used between Google and the email form.
export function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[12px] font-black uppercase tracking-widest text-black/40">
      <span className="h-0.5 flex-1 bg-black" />
      or
      <span className="h-0.5 flex-1 bg-black" />
    </div>
  );
}

// Primary (red) submit button for the Bauhaus auth pages.
export function AuthSubmit({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-1 h-12 w-full border-2 border-black bg-[#D02020] text-[15px] font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_0px_#121212] transition-all duration-200 ease-out hover:brightness-95 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
    >
      {children}
    </button>
  );
}
