import { Reveal } from "./Reveal";
import { WaitlistForm } from "./WaitlistForm";

const DISCORD_INVITE = "https://discord.gg/7AYW4693XQ";

export function BottomCTA() {
  return (
    <section className="mx-auto max-w-[1180px] px-5 md:px-8 py-12">
      <Reveal>
        <div className="relative overflow-hidden rounded-[36px] bg-primary px-6 py-20 md:py-24 text-center text-on-primary">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <h2 className="text-display-small">Stop guessing. Start spying.</h2>
            <p className="mx-auto mt-5 mb-10 max-w-[540px] text-body-large opacity-90">
              Join the waitlist and be first in line when NicheSpy opens. Early members
              get the best pricing and priority access.
            </p>

            <WaitlistForm source="bottom" compact placeholder="your@email.com" buttonLabel="Get Early Access" />

            <div className="mt-6 flex flex-wrap justify-center gap-6 text-[15px] opacity-90">
              <span>Free to join</span>
              <span>No spam, ever</span>
              <span>Unsubscribe anytime</span>
            </div>

            <div className="mt-10 flex flex-col items-center gap-3">
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full bg-[#5865F2] px-7 py-3.5 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.05a19.909 19.909 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Join the Discord
              </a>
              <p className="max-w-[340px] text-[14px] opacity-80">
                Build updates, early feature drops, and shop talk with other creators.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
