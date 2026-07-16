import { Reveal } from "../Reveal";

const STEPS = [
  { n: "01", title: "Pick your niche", body: "Tell NicheSpy what you make. It instantly maps every competitor and their best-performing videos." },
  { n: "02", title: "Spot what's working", body: "Outliers, topic gaps, and viral videos surface automatically, ranked by how hard they beat the average." },
  { n: "03", title: "Make it yours", body: "Turn any winning idea into a hook-first script and hit record. You're first to the topic, every time." },
];

export function LpHowItWorks() {
  return (
    <section id="how" className="border-y border-white/[0.06] bg-white/[0.015] py-24 md:py-28">
      <div className="mx-auto max-w-[1180px] px-5 md:px-8">
        <Reveal>
          <h2 className="font-heading text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.01em] text-white max-w-[720px]">
            From blank page to{" "}
            <span className="bg-gradient-to-r from-[#0FA5E9] to-[#01D4FF] bg-clip-text text-transparent">record button</span> in three steps
          </h2>
        </Reveal>
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="h-full rounded-[28px] border border-white/[0.08] bg-[#171d2b] p-8">
                <span className="font-heading text-[clamp(30px,4vw,44px)] font-bold text-[#01D4FF]/25">{s.n}</span>
                <h3 className="font-heading mt-4 text-[22px] font-bold text-white">{s.title}</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-white/60">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
