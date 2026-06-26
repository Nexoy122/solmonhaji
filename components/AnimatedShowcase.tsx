"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cinematic looping product showcase for the hero.
 * Scenes: hook → Competitor Finder → Outlier Detector → Viral Alerts → CTA.
 * Self-contained: scoped CSS + particle canvas + scene timeline, all prefixed
 * with `ns-` so it never collides with the site's Material-3 globals.
 */

const SCENES = ["s0", "s1", "s2", "s3", "s4"];
const DUR = [3600, 4000, 3700, 3500, 4200];
const CDELAY = [0, 1550, 1000, 0, 0];

export function AnimatedShowcase() {
  const heroRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(0);

  // responsive scaling — internal coords are always 1280×720
  useEffect(() => {
    const hero = heroRef.current;
    const stage = stageRef.current;
    if (!hero || !stage) return;
    const fit = () => stage.style.setProperty("--scale", String(hero.clientWidth / 1280));
    const ro = new ResizeObserver(fit);
    ro.observe(hero);
    fit();
    return () => ro.disconnect();
  }, []);

  // ambient particle field
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const COLORS = ["#0fa5e9", "#27d3ee", "#5b8cff"];
    const pts = Array.from({ length: 64 }, () => ({
      x: Math.random() * 1280,
      y: Math.random() * 720,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 2 + 0.6,
      c: COLORS[Math.floor(Math.random() * 3)],
      a: Math.random() * 0.5 + 0.15,
    }));
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, 1280, 720);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = 1280; if (p.x > 1280) p.x = 0;
        if (p.y < 0) p.y = 720; if (p.y > 720) p.y = 0;
        ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  // scene timeline (loops forever)
  useEffect(() => {
    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;
    const play = () => {
      setActive(idx);
      const cur = idx;
      // count-up after the scene's delay
      setTimeout(() => runCounters(stageRef.current, SCENES[cur]), CDELAY[cur]);
      const wait = DUR[idx];
      idx = (idx + 1) % SCENES.length;
      timer = setTimeout(play, wait);
    };
    play();
    return () => clearTimeout(timer);
  }, []);

  const sc = (i: number) => `ns-scene${active === i ? " ns-active" : ""}`;

  return (
    <div className="ns-hero" ref={heroRef}>
      <div className="ns-stage" ref={stageRef}>
        {/* ambient background */}
        <canvas id="ns-fx" ref={canvasRef} width={1280} height={720} className="ns-layer" />
        <div className="ns-layer ns-blob ns-a" />
        <div className="ns-layer ns-blob ns-b" />
        <div className="ns-layer ns-grid" />
        <div className="ns-layer ns-radar" />

        {/* SCENE 0 — hook */}
        <section className={sc(0)} id="s0">
          <svg className="ns-reticle" viewBox="0 0 100 100" fill="none" stroke="#0fa5e9" strokeWidth=".5">
            <circle cx="50" cy="50" r="46" /><circle cx="50" cy="50" r="30" /><circle cx="50" cy="50" r="14" />
            <path d="M50 0v18M50 82v18M0 50h18M82 50h18" />
          </svg>
          <div className="ns-kicker"><span className="ns-dot" />YouTube competitor intelligence</div>
          <h1 className="ns-h1">
            <span className="ns-word" style={{ ["--d" as string]: "0s" }}>Spy</span>
            <span className="ns-word" style={{ ["--d" as string]: ".07s" }}>on</span>
            <span className="ns-word" style={{ ["--d" as string]: ".14s" }}>your</span>
            <span className="ns-word" style={{ ["--d" as string]: ".21s" }}>competitors</span>
            <br /><span className="ns-pop">in 60 seconds.</span>
          </h1>
        </section>

        {/* SCENE 1 — Competitor Finder */}
        <section className={sc(1)} id="s1">
          <div className="ns-tag"><span className="ns-num">01</span>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            Competitor Finder</div>
          <div className="ns-search">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <span className="ns-typed">true crime</span>
          </div>
          <div className="ns-results">
            <div className="ns-card" style={{ ["--d" as string]: "1.5s" }}><div className="ns-avatar" style={{ background: "linear-gradient(135deg,#0fa5e9,#5b8cff)" }}>M</div>
              <div><div className="ns-nm">Midnight Files</div><div className="ns-sub"><b><span data-count="1.2" data-dec="1">0</span>M</b> subscribers</div></div></div>
            <div className="ns-card" style={{ ["--d" as string]: "1.7s" }}><div className="ns-avatar" style={{ background: "linear-gradient(135deg,#27d3ee,#3a7bff)" }}>C</div>
              <div><div className="ns-nm">CaseBreak</div><div className="ns-sub"><b><span data-count="847" data-dec="0">0</span>K</b> subscribers</div></div></div>
            <div className="ns-card" style={{ ["--d" as string]: "1.9s" }}><div className="ns-avatar" style={{ background: "linear-gradient(135deg,#27d3ee,#0fa5e9)" }}>D</div>
              <div><div className="ns-nm">Cold Cases Daily</div><div className="ns-sub"><b><span data-count="2.4" data-dec="1">0</span>M</b> subscribers</div></div></div>
          </div>
        </section>

        {/* SCENE 2 — Outlier Detector */}
        <section className={sc(2)} id="s2">
          <div className="ns-tag"><span className="ns-num">02</span>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /><path d="M21 7v5h-5" /></svg>
            Outlier Detector</div>
          <div className="ns-chart">
            <div className="ns-avg"><span>channel average</span></div>
            <div className="ns-bar" style={{ ["--h" as string]: "70px", ["--d" as string]: ".05s" }} />
            <div className="ns-bar" style={{ ["--h" as string]: "54px", ["--d" as string]: ".10s" }} />
            <div className="ns-bar" style={{ ["--h" as string]: "88px", ["--d" as string]: ".15s" }} />
            <div className="ns-bar" style={{ ["--h" as string]: "62px", ["--d" as string]: ".20s" }} />
            <div className="ns-bar ns-out" style={{ ["--h" as string]: "240px", ["--d" as string]: ".45s" }} />
            <div className="ns-bar" style={{ ["--h" as string]: "74px", ["--d" as string]: ".30s" }} />
            <div className="ns-bar" style={{ ["--h" as string]: "50px", ["--d" as string]: ".35s" }} />
            <div className="ns-bar" style={{ ["--h" as string]: "80px", ["--d" as string]: ".40s" }} />
            <div className="ns-callout">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              <span data-count="14" data-dec="0">0</span>× average views
            </div>
          </div>
        </section>

        {/* SCENE 3 — Viral Alerts */}
        <section className={sc(3)} id="s3">
          <div className="ns-tag"><span className="ns-num">03</span>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 004 0" /></svg>
            Viral Alerts</div>
          <div className="ns-toast" style={{ ["--d" as string]: ".1s" }}>
            <div className="ns-bell"><svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 004 0" /></svg></div>
            <div><div className="ns-t1">Midnight Files just posted</div><div className="ns-t2">Gaining traction fast — <b>+18K views</b> in 2h</div></div>
            <div className="ns-live"><span className="ns-pdot" />Live</div>
          </div>
          <div className="ns-toast" style={{ ["--d" as string]: ".4s" }}>
            <div className="ns-bell"><svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /><path d="M21 7v5h-5" /></svg></div>
            <div><div className="ns-t1">Outlier detected in your niche</div><div className="ns-t2">Tracking <b>9× average</b> — act before it peaks</div></div>
            <div className="ns-live"><span className="ns-pdot" />Live</div>
          </div>
        </section>

        {/* SCENE 4 — CTA */}
        <section className={sc(4)} id="s4">
          <div className="ns-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="ns-mark"><img src="/favicon.webp" alt="NicheSpy" width={60} height={60} /></span>
            <span className="ns-name">NicheSpy</span>
          </div>
          <div className="ns-tagline">Know what&apos;s working before they do.</div>
          <a className="ns-btn" href="#top">Join the waitlist</a>
          <div className="ns-meta">Free · No credit card · <b>247 creators</b> already in</div>
        </section>

        <div className="ns-layer ns-vignette" />
      </div>

      <style>{CSS}</style>
    </div>
  );
}

// count-up helper — runs on the active scene's counters
function runCounters(root: HTMLElement | null, sceneId: string) {
  if (!root) return;
  const scene = root.querySelector(`#${sceneId}`);
  if (!scene || !scene.classList.contains("ns-active")) return;
  scene.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const target = parseFloat(el.dataset.count || "0");
    const dec = parseInt(el.dataset.dec || "0");
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 1100);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

const CSS = `
.ns-hero{
  position:relative; width:100%; max-width:1180px; margin:0 auto; aspect-ratio:16/9;
  overflow:hidden; border-radius:24px; isolation:isolate;
  /* brand blue #0FA5E9 drives the whole animation now */
  --red:#0fa5e9; --red2:#5bc6f5; --cyan:#27d3ee; --violet:#5b8cff;
  --ink:#eef0fb; --mut:#9aa0bd; --line:rgba(255,255,255,.08); --glow:rgba(15,165,233,.55);
  --bg0:#050a12; --bg1:#0a1422;
  background:radial-gradient(900px 560px at 50% 18%, #11233a 0%, var(--bg1) 48%, var(--bg0) 100%);
  box-shadow:0 40px 100px -30px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.05);
  color:var(--ink); font-family:"Roboto",system-ui,sans-serif;
}
.ns-stage{ position:absolute; top:0; left:0; width:1280px; height:720px; transform-origin:top left; transform:scale(var(--scale,1)); }
.ns-layer{ position:absolute; inset:0 }
#ns-fx{ position:absolute; inset:0; opacity:.55 }
.ns-grid{ position:absolute; inset:-40px;
  background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
  background-size:54px 54px;
  -webkit-mask:radial-gradient(700px 460px at 50% 42%,#000 30%,transparent 78%);
          mask:radial-gradient(700px 460px at 50% 42%,#000 30%,transparent 78%);
  animation:ns-gridDrift 24s linear infinite; }
.ns-radar{ position:absolute; left:50%; top:46%; width:1000px; height:1000px; transform:translate(-50%,-50%); border-radius:50%;
  background:conic-gradient(from 0deg, transparent 0 296deg, rgba(15,165,233,.16) 348deg, rgba(15,165,233,.34) 360deg);
  filter:blur(2px); opacity:.7; animation:ns-spin 9s linear infinite; }
.ns-blob{ position:absolute; width:560px; height:560px; border-radius:50%; filter:blur(90px); opacity:.45 }
.ns-blob.ns-a{ left:8%; top:6%; background:radial-gradient(circle,var(--violet),transparent 60%); animation:ns-drift1 16s ease-in-out infinite }
.ns-blob.ns-b{ right:6%; bottom:2%; background:radial-gradient(circle,var(--cyan),transparent 60%); animation:ns-drift2 19s ease-in-out infinite }
.ns-vignette{ position:absolute; inset:0; background:radial-gradient(120% 90% at 50% 50%,transparent 58%,rgba(0,0,0,.55) 100%) }

.ns-scene{ position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; opacity:0; transition:opacity .55s ease; pointer-events:none }
.ns-scene.ns-active{ opacity:1 }
.ns-scene.ns-active .ns-btn{ pointer-events:auto }

.ns-kicker{ font-size:15px; letter-spacing:.34em; text-transform:uppercase; font-weight:600; color:var(--cyan); margin-bottom:22px; display:flex; align-items:center; gap:12px }
.ns-kicker .ns-dot{ width:7px; height:7px; border-radius:50%; background:var(--red); box-shadow:0 0 12px var(--red) }
.ns-h1{ font-size:74px; line-height:1.04; font-weight:800; letter-spacing:-.02em }
.ns-word{ display:inline-block; margin:0 .12em }
.ns-scene.ns-active .ns-word{ animation:ns-riseIn .62s var(--d,0s) both }
.ns-pop{ display:inline-block; margin-top:14px; font-size:80px; font-weight:900; color:var(--red); text-shadow:0 0 38px var(--glow); letter-spacing:-.02em }
.ns-scene.ns-active .ns-pop{ animation:ns-popGlow .7s .62s both }
.ns-reticle{ position:absolute; left:50%; top:50%; width:520px; height:520px; opacity:.18; transform:translate(-50%,-50%) }
.ns-scene.ns-active .ns-reticle{ animation:ns-spinC 26s linear infinite }

.ns-tag{ position:absolute; top:74px; left:50%; transform:translateX(-50%); display:inline-flex; align-items:center; gap:10px; padding:10px 18px; border:1px solid var(--line); border-radius:999px; background:rgba(255,255,255,.04); font-size:15px; font-weight:600; color:var(--ink); backdrop-filter:blur(6px) }
.ns-tag .ns-num{ color:var(--red); font-weight:800 }
.ns-tag svg{ width:18px; height:18px; stroke:var(--cyan) }
.ns-scene.ns-active .ns-tag{ animation:ns-fadeDown .5s both }

.ns-search{ display:flex; align-items:center; gap:14px; width:560px; padding:18px 22px; border:1px solid rgba(255,255,255,.12); border-radius:16px; background:rgba(13,13,26,.7); backdrop-filter:blur(8px); box-shadow:0 20px 50px -20px #000; margin-bottom:34px }
.ns-search svg{ width:24px; height:24px; stroke:var(--mut); flex:none }
.ns-scene.ns-active .ns-search{ animation:ns-riseIn .55s both }
.ns-typed{ font-size:26px; font-weight:600; white-space:nowrap; overflow:hidden; border-right:2px solid var(--red); width:0; color:var(--ink) }
.ns-scene.ns-active .ns-typed{ animation:ns-typing 1.05s steps(10) .45s forwards, ns-caret .7s steps(1) .45s 4 }
.ns-results{ display:flex; gap:22px }
.ns-card{ width:300px; padding:20px; border:1px solid var(--line); border-radius:16px; background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02)); display:flex; align-items:center; gap:16px; text-align:left }
.ns-scene.ns-active .ns-card{ animation:ns-riseIn .6s var(--d) both }
.ns-avatar{ width:54px; height:54px; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:22px; color:#fff }
.ns-card .ns-nm{ font-size:19px; font-weight:700 }
.ns-card .ns-sub{ font-size:15px; color:var(--mut); margin-top:3px }
.ns-card .ns-sub b{ color:var(--cyan); font-weight:700 }

.ns-chart{ position:relative; width:520px; height:300px; display:flex; align-items:flex-end; justify-content:center; gap:15px; padding-bottom:6px }
.ns-avg{ position:absolute; left:0; right:0; bottom:96px; border-top:2px dashed rgba(255,255,255,.35) }
.ns-avg span{ position:absolute; right:0; top:-26px; font-size:13px; color:var(--mut); letter-spacing:.08em; text-transform:uppercase }
.ns-bar{ width:36px; border-radius:8px 8px 0 0; height:0; background:linear-gradient(180deg,#3a3a5c,#26263f) }
.ns-scene.ns-active .ns-bar{ animation:ns-growBar .7s var(--d) cubic-bezier(.2,.8,.2,1) both }
.ns-bar.ns-out{ background:linear-gradient(180deg,var(--red2),var(--red)); box-shadow:0 0 34px var(--glow) }
.ns-callout{ position:absolute; top:8px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:12px; background:var(--red); color:#fff; font-weight:800; font-size:18px; box-shadow:0 0 30px var(--glow) }
.ns-callout svg{ width:18px; height:18px; stroke:#fff }
.ns-scene.ns-active .ns-callout{ animation:ns-popGlowC .55s 1s both }

.ns-toast{ display:flex; align-items:center; gap:16px; width:560px; padding:20px 22px; margin:10px 0; border:1px solid rgba(255,255,255,.1); border-radius:16px; text-align:left; background:linear-gradient(180deg,rgba(20,20,38,.92),rgba(13,13,26,.92)); backdrop-filter:blur(8px); box-shadow:0 24px 60px -26px #000 }
.ns-scene.ns-active .ns-toast{ animation:ns-slideInRight .6s var(--d) cubic-bezier(.2,.8,.2,1) both }
.ns-bell{ width:46px; height:46px; border-radius:12px; flex:none; display:flex; align-items:center; justify-content:center; background:rgba(15,165,233,.16) }
.ns-bell svg{ width:24px; height:24px; stroke:var(--red) }
.ns-scene.ns-active .ns-bell svg{ animation:ns-ring 1.4s ease-in-out infinite }
.ns-toast .ns-t1{ font-size:19px; font-weight:700 }
.ns-toast .ns-t2{ font-size:15px; color:var(--mut); margin-top:3px }
.ns-toast .ns-t2 b{ color:var(--red2); font-weight:700 }
.ns-live{ margin-left:auto; display:flex; align-items:center; gap:7px; font-size:13px; font-weight:700; letter-spacing:.1em; color:var(--red); text-transform:uppercase }
.ns-live .ns-pdot{ width:8px; height:8px; border-radius:50%; background:var(--red); box-shadow:0 0 10px var(--red); animation:ns-pulse 1.3s infinite }

.ns-logo{ display:flex; align-items:center; gap:16px; margin-bottom:18px }
.ns-logo .ns-mark{ width:60px; height:60px; display:flex; align-items:center; justify-content:center; border-radius:16px; overflow:hidden; box-shadow:0 0 36px var(--glow) }
.ns-logo .ns-mark img{ width:60px; height:60px; border-radius:16px; object-fit:cover }
.ns-logo .ns-name{ font-family:"Space Grotesk","Roboto",sans-serif; font-size:52px; font-weight:700 }
.ns-scene.ns-active .ns-logo{ animation:ns-riseIn .6s both }
.ns-tagline{ font-size:30px; font-weight:600; color:var(--ink); margin-bottom:34px }
.ns-scene.ns-active .ns-tagline{ animation:ns-riseIn .6s .15s both }
.ns-btn{ position:relative; overflow:hidden; padding:20px 44px; border-radius:14px; border:0; font-size:23px; font-weight:800; color:#fff; cursor:pointer; text-decoration:none; display:inline-block; background:linear-gradient(180deg,var(--red2),var(--red)); box-shadow:0 0 44px var(--glow) }
.ns-btn::after{ content:""; position:absolute; top:0; left:-60%; width:40%; height:100%; background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent); transform:skewX(-18deg); animation:ns-shine 2.8s ease-in-out infinite }
.ns-scene.ns-active .ns-btn{ animation:ns-riseIn .6s .3s both, ns-breathe 2.4s ease-in-out .9s infinite }
.ns-meta{ margin-top:24px; font-size:17px; color:var(--mut) }
.ns-meta b{ color:var(--cyan); font-weight:700 }
.ns-scene.ns-active .ns-meta{ animation:ns-fadeIn .6s .5s both }

@keyframes ns-riseIn{ from{opacity:0; transform:translateY(26px)} to{opacity:1; transform:none} }
@keyframes ns-fadeIn{ from{opacity:0} to{opacity:1} }
@keyframes ns-fadeDown{ from{opacity:0; transform:translateX(-50%) translateY(-14px)} to{opacity:1; transform:translateX(-50%) translateY(0)} }
@keyframes ns-popGlow{ 0%{opacity:0; transform:scale(.7)} 60%{transform:scale(1.08)} 100%{opacity:1; transform:scale(1)} }
@keyframes ns-popGlowC{ 0%{opacity:0; transform:translateX(-50%) scale(.7)} 60%{transform:translateX(-50%) scale(1.08)} 100%{opacity:1; transform:translateX(-50%) scale(1)} }
@keyframes ns-typing{ to{width:10ch} }
@keyframes ns-caret{ 50%{border-color:transparent} }
@keyframes ns-growBar{ from{height:0} to{height:var(--h)} }
@keyframes ns-slideInRight{ from{opacity:0; transform:translateX(70px)} to{opacity:1; transform:none} }
@keyframes ns-spin{ to{transform:translate(-50%,-50%) rotate(360deg)} }
@keyframes ns-spinC{ to{transform:translate(-50%,-50%) rotate(360deg)} }
@keyframes ns-gridDrift{ to{transform:translate(54px,54px)} }
@keyframes ns-pulse{ 0%,100%{transform:scale(1); opacity:1} 50%{transform:scale(1.7); opacity:.4} }
@keyframes ns-ring{ 0%,70%,100%{transform:rotate(0)} 80%{transform:rotate(14deg)} 90%{transform:rotate(-12deg)} }
@keyframes ns-breathe{ 0%,100%{box-shadow:0 0 30px var(--glow)} 50%{box-shadow:0 0 64px var(--glow)} }
@keyframes ns-shine{ 0%,100%{left:-60%} 55%{left:130%} }
@keyframes ns-drift1{ 0%,100%{transform:translate(0,0)} 50%{transform:translate(60px,40px)} }
@keyframes ns-drift2{ 0%,100%{transform:translate(0,0)} 50%{transform:translate(-50px,-30px)} }
@media (prefers-reduced-motion: reduce){
  .ns-grid,.ns-radar,.ns-blob,.ns-reticle,.ns-btn::after,.ns-bell svg,.ns-live .ns-pdot{ animation:none !important }
}
`;
