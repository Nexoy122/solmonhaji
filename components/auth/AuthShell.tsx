"use client";

import { useState } from "react";
import Link from "next/link";
import { ToolShowcase } from "@/components/auth/ToolShowcase";

// ── Dark auth theme (self-contained — global tokens stay light for the
//    live waitlist pages). Panel #0D0D11, page #151416, cyan brand accent. ──
export const AUTH_DARK = {
  page: "#151416",
  panel: "#0D0D11",
  card: "#1C1B20",
  border: "#2B2A30",
  text: "#EDEDEF",
  muted: "#9A99A1",
  accent: "#0FA5E9",
};

// Shared split-screen auth layout: animated tool-showcase panel + form card,
// over a dark faded grid.
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
    <main className="relative flex min-h-screen bg-[#0B0B0F] text-[#EDEDEF]">
      {/* Faded grid backdrop (dark-adapted). On mobile the mask centers on the
          card; on desktop it fades from the top. */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 120% 90% at 50% 30%, #000 45%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 120% 90% at 50% 30%, #000 45%, transparent 100%)",
        }}
      />

      {/* Left: animated tool showcase (hidden on small screens) — edge to edge */}
      <aside className="relative z-10 hidden w-[46%] lg:block">
        <ToolShowcase />
      </aside>

      {/* Center divider line */}
      <div className="relative z-10 hidden w-px self-stretch bg-white/[0.08] lg:block" />

      {/* Right: form panel */}
      <section className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
        <div className="w-full max-w-[430px]">
          {/* logo on mobile */}
          <Link href="/" className="mb-7 flex items-center justify-center gap-2.5 font-heading text-[21px] font-bold text-white lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.webp" alt="" width={32} height={32} className="rounded-lg" />
            NicheSpy
          </Link>

          {/* Login info card (sharp-edged) with a soft brand glow behind it */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-x-6 -top-6 bottom-0 -z-10 bg-[#0FA5E9]/[0.06] blur-[60px]" />
            <div className="border border-white/[0.08] bg-[#0F0F14] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:p-8">
              <h1 className="font-heading text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[27px]">{title}</h1>
              <p className="mt-2 text-[14.5px] text-[#A7AEB8]">{subtitle}</p>

              <div className="mt-7">{children}</div>
            </div>
          </div>

          <p className="mt-6 text-center text-[14px] text-[#A7AEB8]">{footer}</p>
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
      className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-[#2B2A30] bg-[#1C1B20] text-[15px] font-medium text-[#EDEDEF] transition-colors hover:border-[#3A393F] hover:bg-[#232227] disabled:opacity-60"
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
      <span className="text-[13.5px] font-medium text-[#C9C8CE]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-12 rounded-md border border-[#2B2A30] bg-[#1A191D] px-4 text-[15px] text-[#EDEDEF] outline-none transition-colors placeholder:text-[#66656D] focus:border-[#0FA5E9] focus:ring-2 focus:ring-[#0FA5E9]/20"
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
  { label: "Weak", color: "#ef4444" },
  { label: "Fair", color: "#f59e0b" },
  { label: "Good", color: "#3b9eff" },
  { label: "Strong", color: "#22c55e" },
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
      <span className="text-[13.5px] font-medium text-[#C9C8CE]">{label}</span>
      <div className="relative">
        <input
          type={reveal ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-12 w-full rounded-md border border-[#2B2A30] bg-[#1A191D] px-4 pr-11 text-[15px] text-[#EDEDEF] outline-none transition-colors placeholder:text-[#66656D] focus:border-[#0FA5E9] focus:ring-2 focus:ring-[#0FA5E9]/20"
        />
        <button
          type="button"
          onClick={() => setReveal((r) => !r)}
          tabIndex={-1}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-[#8A8994] transition-colors hover:text-[#EDEDEF]"
        >
          {reveal ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="mt-1 flex items-center gap-2.5">
          <div className="flex flex-1 gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{ backgroundColor: i <= score ? meta.color : "#2B2A30" }}
              />
            ))}
          </div>
          <span className="w-[52px] shrink-0 text-right text-[12px] font-semibold" style={{ color: meta.color || "#66656D" }}>
            {meta.label}
          </span>
        </div>
      )}
    </label>
  );
}

// Dark divider ("or") used between Google and the email form.
export function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[12.5px] font-medium text-[#66656D]">
      <span className="h-px flex-1 bg-[#2B2A30]" />
      or
      <span className="h-px flex-1 bg-[#2B2A30]" />
    </div>
  );
}

// Primary (cyan) submit button for the dark auth pages.
export function AuthSubmit({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-1 h-12 w-full rounded-md bg-[#0FA5E9] text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(15,165,233,0.25)] transition-all hover:bg-[#0b8fd0] active:scale-[0.99] disabled:opacity-60"
    >
      {children}
    </button>
  );
}
