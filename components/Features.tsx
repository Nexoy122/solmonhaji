import { Reveal } from "./Reveal";

type Tone = "primary" | "tertiary";

const tone: Record<Tone, { icon: string; chip: string; stroke: string }> = {
  primary: {
    icon: "bg-primary-container text-on-primary-container",
    chip: "bg-primary-container text-on-primary-container",
    stroke: "var(--color-on-primary-container)",
  },
  tertiary: {
    icon: "bg-tertiary-container text-on-tertiary-container",
    chip: "bg-tertiary-container text-on-tertiary-container",
    stroke: "var(--color-on-tertiary-container)",
  },
};

function Card({
  t = "primary", name, desc, tag, icon, delay,
}: {
  t?: Tone;
  name: string;
  desc: string;
  tag: string;
  icon: React.ReactNode;
  delay: number;
}) {
  const c = tone[t];
  return (
    <Reveal delay={delay} className="h-full">
      <div className="group h-full rounded-[28px] border border-outline-variant bg-surface-container-lowest p-8 md:p-10 transition-all duration-300 hover:-translate-y-1 hover:m3-card">
        <div className={`mb-7 flex h-16 w-16 items-center justify-center rounded-2xl ${c.icon}`}>{icon}</div>
        <h3 className="mb-3 text-headline-small">{name}</h3>
        <p className="text-body-large text-on-surface-variant">{desc}</p>
        <div className={`mt-7 inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-semibold ${c.chip}`}>
          {tag}
        </div>
      </div>
    </Reveal>
  );
}

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-[1180px] px-5 md:px-8 py-24 md:py-32">
      <Reveal>
        <h2 className="text-display-small max-w-[820px]">
          Six tools that replace your{" "}
          <span className="text-primary">entire research spreadsheet</span>
        </h2>
      </Reveal>
      <Reveal delay={0.08}>
        <p className="text-body-large mt-6 max-w-[640px] text-on-surface-variant">
          Everything you&apos;ve been doing by hand, competitor hunting, video analysis,
          gap-finding, automated and updated in real time.
        </p>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card
          name="Competitor Finder"
          desc="Type any niche and instantly get every competitor channel, subscriber count, total views, and how often they post."
          tag="INSTANT RESULTS"
          delay={0}
          icon={<svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke={tone.primary.stroke} strokeWidth="1.6" strokeLinecap="round"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /><path d="M6 9h6M9 6v6" opacity="0.5" /></svg>}
        />
        <Card
          name="Outlier Detector"
          desc="Surfaces the videos that crushed a channel's average, the exact formats and titles the algorithm is rewarding right now."
          tag="WHAT'S WORKING"
          delay={0.06}
          icon={<svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke={tone.primary.stroke} strokeWidth="1.6" strokeLinecap="round"><path d="M3 15l4-6 4 4 3-5 3 3" /><circle cx="17" cy="4" r="2" fill={tone.primary.stroke} opacity="0.4" /></svg>}
        />
        <Card
          t="tertiary"
          name="Gap Finder"
          desc="Reveals trending topics nobody in your niche has covered yet. Make that video first and you compete on an empty field."
          tag="FIRST-MOVER EDGE"
          delay={0.12}
          icon={<svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke={tone.tertiary.stroke} strokeWidth="1.6" strokeLinecap="round"><path d="M4 16l4-4 4 2 4-8" /><circle cx="4" cy="16" r="1.5" fill={tone.tertiary.stroke} /></svg>}
        />
        <Card
          name="Viral Alerts"
          desc="Get an email the second a competitor's video takes off. You're always first to know, and first to react, in your niche."
          tag="REAL-TIME"
          delay={0.18}
          icon={<svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke={tone.primary.stroke} strokeWidth="1.6" strokeLinecap="round"><path d="M10 2v4M15 4l-2.5 2.5M18 10h-4M15 16l-2.5-2.5M10 18v-4M5 16l2.5-2.5M2 10h4M5 4l2.5 2.5" /><circle cx="10" cy="10" r="3" /></svg>}
        />

        {/* Competitor Dashboard, full width */}
        <Reveal delay={0.22} className="md:col-span-2 h-full">
          <div className="grid h-full grid-cols-1 lg:grid-cols-2 items-center gap-10 rounded-[28px] border border-outline-variant bg-surface-container-lowest p-8 md:p-10">
            <div>
              <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
                <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke={tone.primary.stroke} strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="3" width="16" height="13" rx="2" /><path d="M6 8h8M6 11h5" /></svg>
              </div>
              <h3 className="mb-3 text-headline-small">Competitor Dashboard</h3>
              <p className="text-body-large text-on-surface-variant">
                Save the channels you care about. Every recent video, views per video, engagement
                rate, and posting schedule, in one clean view.
              </p>
              <div className="mt-7 inline-flex items-center rounded-full bg-primary-container px-4 py-1.5 text-[13px] font-semibold text-on-primary-container">
                EVERYTHING IN ONE PLACE
              </div>
            </div>
            <div className="rounded-2xl bg-surface-container px-6 py-5">
              <div className="mb-4 text-title-medium">Tracked Channels (4)</div>
              <div className="flex flex-col gap-3">
                {[
                  { h: "@mkbhd", v: "↑ 2.4M views", c: "text-success" },
                  { h: "@LinusTech", v: "891K views", c: "text-on-surface-variant" },
                  { h: "@UnboxTherapy", v: "↓ 310K views", c: "text-error" },
                  { h: "@JerryRig", v: "620K views", c: "text-on-surface-variant", dim: true },
                ].map((row) => (
                  <div key={row.h} className={`flex justify-between rounded-xl bg-surface-container-lowest px-4 py-3 text-[15px] ${row.dim ? "opacity-50" : ""}`}>
                    <span className="font-medium">{row.h}</span>
                    <span className={row.c}>{row.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
