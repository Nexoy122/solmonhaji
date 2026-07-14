import Link from "next/link";
import { Check } from "lucide-react";
import { BhLabel } from "./BhKit";

const PLANS = [
  {
    name: "Starter", price: "$9", accent: "#F0C020",
    features: ["All tools included", "500 credits / month", "1 connected channel", "7-day history", "Community support"],
  },
  {
    name: "Creator", price: "$19", accent: "#D02020", featured: true,
    features: ["All tools included", "1,500 credits / month", "3 connected channels", "30-day history", "Priority email support"],
  },
  {
    name: "Plus", price: "$39", accent: "#1040C0",
    features: ["All tools included", "4,000 credits / month", "10 connected channels", "Unlimited history", "Priority + early access"],
  },
];

export function BhPricing() {
  return (
    <section id="pricing" className="border-b-4 border-black bg-[#F0F0F0]">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <BhLabel className="text-[#D02020]">// Pricing</BhLabel>
          <h2 className="mt-4 text-[clamp(32px,5vw,64px)] font-black uppercase leading-[0.9] tracking-tighter text-black">
            Every plan gets every tool
          </h2>
          <p className="mt-5 text-[17px] font-medium text-black/70">Pick by how much you create. Scale credits, channels & support — not access.</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3 md:items-start">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative border-2 border-black bg-white p-8 shadow-[8px_8px_0px_0px_#121212] md:border-4 ${p.featured ? "md:-translate-y-4" : ""}`}
            >
              {p.featured && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 border-2 border-black bg-[#D02020] px-4 py-1 text-[12px] font-black uppercase tracking-widest text-white shadow-[3px_3px_0px_0px_#121212]">
                  Most popular
                </span>
              )}
              <span className="inline-block h-6 w-6 border-2 border-black" style={{ background: p.accent }} />
              <h3 className="mt-4 text-[26px] font-black uppercase tracking-tight text-black">{p.name}</h3>
              <div className="mt-2 flex items-end gap-1.5">
                <span className="text-[52px] font-black leading-none text-black">{p.price}</span>
                <span className="mb-2 text-[15px] font-bold uppercase text-black/50">/ mo</span>
              </div>
              <ul className="mt-7 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[15px] font-medium text-black">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-black" style={{ background: p.accent }}>
                      <Check className="h-3 w-3 text-black" strokeWidth={4} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-8 flex w-full items-center justify-center border-2 border-black px-6 py-3 text-[15px] font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#121212] transition-all duration-200 ease-out active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${p.featured ? "bg-[#D02020] text-white" : "bg-white text-black hover:bg-[#F0F0F0]"}`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
