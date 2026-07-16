import { Reveal } from "../Reveal";

// "Partners / integrations" strip. Placeholder cards (no real logos), swap for
// real partner/integration logos later.
const PARTNERS = ["YouTube", "Groq AI", "Discord", "Polar", "Cloudflare", "Firebase"];

export function LpPartners() {
  return (
    <section id="partners" className="border-y border-white/[0.06] px-5 md:px-8 py-16">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <p className="text-center text-[13px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Powered by &amp; integrated with
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {PARTNERS.map((p) => (
              <div
                key={p}
                className="flex h-16 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-[15px] font-bold text-white/45 transition-colors hover:border-white/20 hover:text-white/70"
              >
                {p}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
