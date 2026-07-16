"use client";

import { useEffect, useState, useCallback } from "react";
import { Logo } from "@/components/Logo";
import { MessageCircle } from "lucide-react";

const DISCORD_INVITE = "https://discord.gg/7AYW4693XQ";

const NICHES = [
  { slug: "commentary", label: "Commentary" },
  { slug: "ranking", label: "Ranking" },
  { slug: "animation", label: "Animation" },
  { slug: "gaming", label: "Gaming" },
  { slug: "captions", label: "Captions" },
  { slug: "edits", label: "Edits" },
  { slug: "memes", label: "Memes" },
];

function parts(ms: number) {
  const s = Math.floor(ms / 1000);
  return {
    h: Math.floor(s / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

// Confetti in the brand colors. Generated once so the pieces don't reshuffle on
// every render, and it's pure CSS: no dependency for a few seconds of party.
const CONFETTI = Array.from({ length: 70 }, (_, i) => {
  const colors = ["#FF0033", "#1040C0", "#F0C020", "#FFFFFF", "#118A3E"];
  return {
    id: i,
    left: Math.random() * 100,
    color: colors[i % colors.length],
    delay: Math.random() * 2.2,
    duration: 2.6 + Math.random() * 2.2,
    size: 7 + Math.random() * 8,
    rot: Math.random() * 360,
    round: i % 3 === 0,
  };
});

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {CONFETTI.map((c) => (
        <span
          key={c.id}
          className="cd-confetti absolute top-[-6%] border-2 border-black"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size * (c.round ? 1 : 1.6),
            background: c.color,
            borderRadius: c.round ? "50%" : 0,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            ["--cd-rot" as string]: `${c.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

function Cell({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-[84px] w-[74px] items-center justify-center border-4 border-black bg-white shadow-[6px_6px_0px_0px_#121212] sm:h-[104px] sm:w-[92px]">
        <span className="text-[40px] font-black leading-none tabular-nums text-black sm:text-[52px]">
          {String(n).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[11px] font-black uppercase tracking-widest text-white/50">{label}</span>
    </div>
  );
}

export function CountdownScreen({ launchAt }: { launchAt: number }) {
  // Start from the server-provided target; compute purely from the client clock
  // after that, so the numbers tick smoothly.
  const [left, setLeft] = useState(() => Math.max(0, launchAt - Date.now()));
  const [live, setLive] = useState(false);

  const tick = useCallback(() => {
    const ms = Math.max(0, launchAt - Date.now());
    setLeft(ms);
    if (ms === 0) setLive(true);
  }, [launchAt]);

  useEffect(() => {
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [tick]);

  // The moment it hits zero, celebrate, then reload: middleware stops
  // redirecting and the real site is served. No manual refresh, no redeploy.
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => window.location.replace("/"), 4200);
    return () => clearTimeout(t);
  }, [live]);

  const { h, m, s } = parts(left);

  return (
    <main className="lp-root relative min-h-screen overflow-hidden bg-[#0A0A0A] text-white antialiased">
      {/* niche footage, dimmed right back so the timer owns the page */}
      <div className="pointer-events-none absolute inset-0 grid grid-cols-3 opacity-[0.16] sm:grid-cols-4 lg:grid-cols-7">
        {NICHES.map((n) => (
          <video
            key={n.slug}
            src={`/niches/${n.slug}.mp4`}
            poster={`/niches/${n.slug}.jpg`}
            muted
            loop
            autoPlay
            playsInline
            preload="none"
            aria-hidden
            className="h-full w-full object-cover"
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/85 via-[#0A0A0A]/70 to-[#0A0A0A]/95" />
      <div className="pointer-events-none absolute inset-0 bh-dots-light opacity-30" />

      {live && <Confetti />}

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
        <div className="flex items-center gap-2.5">
          <Logo size={34} priority />
          <span className="text-[22px] font-black uppercase tracking-tighter">NicheSpy</span>
        </div>

        <span className="mt-8 inline-flex items-center gap-2 border-2 border-black bg-[#F0C020] px-3.5 py-1.5 text-[12px] font-black uppercase tracking-widest text-black">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF0033]" />
          Beta launches soon
        </span>

        <h1 className="mt-6 text-[clamp(38px,9vw,86px)] font-black uppercase leading-[0.88] tracking-tighter">
          {live ? (
            <span className="cd-pop inline-block">
              <span className="block text-[clamp(44px,11vw,96px)]">🎉</span>
              We&apos;re<br /><span className="inline-block bg-[#FF0033] px-3">live</span>
            </span>
          ) : (
            <>Beta drops<br />in</>
          )}
        </h1>

        {!live && (
          <div className="mt-9 flex items-start gap-3 sm:gap-4">
            <Cell n={h} label="Hours" />
            <span className="mt-5 text-[36px] font-black leading-none text-white/30 sm:mt-7 sm:text-[46px]">:</span>
            <Cell n={m} label="Minutes" />
            <span className="mt-5 text-[36px] font-black leading-none text-white/30 sm:mt-7 sm:text-[46px]">:</span>
            <Cell n={s} label="Seconds" />
          </div>
        )}

        <p className="mt-9 max-w-md text-[15.5px] font-medium leading-relaxed text-white/65">
          {live
            ? "The beta is open. Taking you in…"
            : "Six tools to find the Shorts actually working in your niche, break down why they popped, and turn them into your next upload."}
        </p>

        {!live && (
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center justify-center gap-2 border-2 border-black bg-[#5865F2] px-6 py-3.5 text-[14px] font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <MessageCircle className="h-5 w-5" strokeWidth={3} /> Get notified in Discord
          </a>
        )}
      </div>
    </main>
  );
}
