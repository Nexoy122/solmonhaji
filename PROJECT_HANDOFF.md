# NicheSpy — Project Handoff & Context

> Read this first. It's the full picture of what NicheSpy is, what's built, how it works,
> and what's left. Give this file to a new Claude/dev and they'll have complete context.

Last updated: 2026-06-26

---

## 1. What NicheSpy is

A **waitlist landing site** for **NicheSpy** — a YouTube competitor-intelligence SaaS for
faceless/automation creators (1k–100k subs, US/EU). It automates manual spreadsheet
research (saves ~3–5 hrs/week): find competitors, spot their winning ("outlier") videos,
find untapped topic gaps, get viral alerts, and (coming soon) a channel "Trust Score."

**The site's only job right now:** collect waitlist emails + build hype before launch.

**Brand:** Material Design 3 (M3) light theme, brand color **`#0FA5E9`**, Roboto font.
Support email **support@vixo.live**. Discord: **https://discord.gg/7AYW4693XQ**.

---

## 2. Two projects / two folders

| Folder | What | Deploy target |
|---|---|---|
| `D:\Eggger\Niche Spy` | The Next.js website (waitlist) | **Vercel** (free) |
| `D:\Eggger\nichespy-bot` | The Discord bot (separate process) | **bot-hosting.net** or Railway (24/7) |

They share the **same Firebase Firestore** (`waitlist-for-nichespy`) — site writes signups,
bot reads them.

---

## 3. Website (`D:\Eggger\Niche Spy`)

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 (`@theme`) · Material
Design 3 · Framer Motion · Firebase (client SDK) · Resend (email).

### Page structure (`app/page.tsx`)
TopBar → Hero → Ticker → Stats → WhatIsIt → Features → TrustScore → HowItWorks → FAQ →
BottomCTA → Footer → DiscordButton → ReferralModal.

### Key features & how they work

- **Waitlist** (`components/WaitlistForm.tsx`): on submit →
  1. validate email → 2. **Turnstile** challenge + server verify (`/api/verify-turnstile`)
  → 3. **duplicate check** (queries Firestore for existing email, case-insensitive)
  → 4. write to Firestore `waitlist` collection (email, source, medium, campaign, referrer,
  landingPath, formLocation, joinedAt) → 5. GA `waitlist_signup` event
  → 6. best-effort `POST /api/send-welcome` (sends email + pings Discord bot).

- **Email** (`app/api/send-welcome/route.ts`): Resend. Dark "Antigravity-style" HTML welcome
  email (centered logo + headline + subtitle, feature list with blue-dot markers, Discord
  CTA). **Sends from `support@vixo.live`** (domain verified — lands in inbox). Also fires the
  Discord `/notify` call. Gracefully no-ops if Resend not configured.

- **Analytics & attribution:**
  - `lib/analytics.ts` + `components/CookieConsent.tsx`: GA4, loads **only after cookie
    consent** (Consent Mode). Full-width consent bar. Banner only shows if `NEXT_PUBLIC_GA_ID`
    is set. GA ID currently: `G-1DWN72Y5P0`.
  - `lib/attribution.ts`: per-signup **traffic source** (instagram/tiktok/youtube/etc).
    Priority: UTM (`?utm_source=`) → platform click-ids (igshid/fbclid/ttclid…) → referrer
    auto-detect → "direct". **First-touch**, stored in localStorage. NOTE: social in-app
    browsers strip referrers → untagged social traffic shows "direct". **Always use UTM links
    for accurate attribution** (the bot's `/genlink` generates them).

- **Bot protection** (`lib/turnstile.ts` + `/api/verify-turnstile`): **Cloudflare Turnstile**,
  invisible challenge, verified server-side before signup. Stops spam/bot signups (NOT a DDoS
  tool — Cloudflare/Vercel handle DDoS at the network layer). Skips gracefully if keys blank.

- **Referral modal** (`components/ReferralModal.tsx`): **PURE MARKETING ILLUSION — it's fake.**
  Triggers in Navbar ("Referral code" button) + Hero ("Have a referral code?" link). Opens a
  modal; **no code ever works** — always shows "Enter a valid referral code." Bottom link:
  "No code? Get one in our Discord server." Makes the waitlist feel exclusive/invite-driven.

- **Legal:** `/privacy` and `/terms` pages (LegalLayout). Floating Discord button on all pages.

### Env vars (`.env`) — current values are LOCAL/test
```
NEXT_PUBLIC_SITE_URL          → set to live domain on deploy (controls email logo URL)
NEXT_PUBLIC_GA_ID="G-1DWN72Y5P0"
NEXT_PUBLIC_TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY → Cloudflare Turnstile (set)
BOT_NOTIFY_URL                → bot's public URL (blank until bot deployed; site appends /notify)
BOT_NOTIFY_SECRET             → must match bot's NOTIFY_SECRET
RESEND_API_KEY                → Resend
EMAIL_FROM="NicheSpy <support@vixo.live>"
```
Firebase client config is baked into `lib/firebase.ts` with defaults.

---

## 4. Discord bot (`D:\Eggger\nichespy-bot`)

**Stack:** Node + TypeScript · discord.js v14 · firebase-admin · express.
Runs **one process** = Discord gateway (slash commands) + HTTP server (`/notify`).

### Commands
| Command | Who | Does |
|---|---|---|
| `/stats` | anyone | Live waitlist stats: total, today, last 7 days, top traffic sources |
| `/listall` | **admin only** | All registered emails (embed, or .txt file if >25). Ephemeral |
| `/delete email:x` | **admin only** | Remove an email from the waitlist (case-insensitive) |
| `/genlink platform:x [campaign:y]` | anyone | Generate a UTM tracking link for any platform |

### Signup notifications
Site `POST /notify` (secret-gated via `x-notify-secret`) → bot posts a "New waitlist signup"
embed to the signups channel (email shown unmasked, source, campaign, running total).

### Env vars (`.env`)
```
DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, SIGNUPS_CHANNEL_ID
NOTIFY_SECRET            → must match site's BOT_NOTIFY_SECRET
GOOGLE_APPLICATION_CREDENTIALS="./serviceAccount.json"  (local)
FIREBASE_SERVICE_ACCOUNT  → for hosting: paste full JSON one-line instead of the file
FIRESTORE_COLLECTION="waitlist"
SITE_URL                → base for /genlink links (set to live domain)
```

### Deploy (bot-hosting.net)
`npm run build` → zip `dist/` + `package.json` + `package-lock.json` (NOT node_modules/src/.env)
→ upload, unarchive → Startup file = `dist/index.js` → add all env vars (use
`FIREBASE_SERVICE_ACCOUNT` one-line, leave PORT blank — it injects SERVER_PORT) →
run `npm run register` once from your PC → start. For signup pings, set the site's
`BOT_NOTIFY_URL` to the bot's public host:port. (Railway/Render also work and give clean URLs.)

---

## 5. Infrastructure / accounts (all done)

- **Domain:** `vixo.live` — DNS on **Cloudflare** (nameservers huxley/ingrid.ns.cloudflare.com).
  Gives free DDoS + CDN. ⚠️ The two `firebase*._domainkey` CNAMEs and all MX/TXT email records
  must stay **"DNS only" (grey cloud)** in Cloudflare — proxying them breaks email/auth.
- **Email:** `vixo.live` **verified in Resend** (SPF + DKIM + MX + DMARC `p=none` all green).
  Sends from `support@vixo.live`, **confirmed landing in inbox (not spam)**.
- **Firebase:** project `waitlist-for-nichespy`, Firestore `waitlist` collection.
- **GA4:** property "NicheSpy", measurement ID `G-1DWN72Y5P0`, stream URL https://vixo.live.
  (GA shows "data collection not active" until the site is deployed + getting consented visits.)
- **Turnstile:** Cloudflare widget, hostnames vixo.live + localhost (ADD real deploy domain too).
- **Discord:** bot app created, invited to server, 4 commands registered.

---

## 6. What's DONE ✅

Site + waitlist (Turnstile-protected, dedup'd) · inbox-landing email from own domain ·
GA4 + cookie consent · traffic-source attribution · Discord bot (4 commands + signup pings) ·
Cloudflare DNS/DDoS · referral-code marketing modal (fake) · privacy/terms · all type-checks
pass, both projects build clean.

## 7. What's LEFT 📋

1. **Deploy site → Vercel** + set all env vars there (RESEND_API_KEY, EMAIL_FROM, Turnstile
   keys, NEXT_PUBLIC_SITE_URL=https://vixo.live, NEXT_PUBLIC_GA_ID, BOT_NOTIFY_URL once bot up).
2. **Point vixo.live → Vercel** (via Cloudflare DNS — add the A/CNAME Vercel gives, proxied OK
   for the website record).
3. **Deploy bot 24/7** (bot-hosting.net or Railway) + set site's `BOT_NOTIFY_URL`.
4. Add Turnstile **real deploy hostname** to the widget; confirm GA "active" after deploy.
5. **ROTATE SECRETS before public launch** — Discord bot token, Resend API key, and Firebase
   service-account key were shared in chat during setup. Regenerate them.

## 8. Important gotchas (learned the hard way)

- **Don't run `next build` while `npm run dev` is running** on the same project → corrupts
  `.next` ("Cannot find module './XXX.js'"). Fix: stop dev, `rm -rf .next`, restart.
- **Gmail strips inline SVG** in emails inconsistently → email uses blue-dot CSS markers, not
  SVG icons. (SVG icons DO work in the Discord bot embeds and on the website.)
- **Resend test mode** (before domain verify) only delivers to your own Resend account email.
- **Social apps strip referrers** → use UTM links for accurate source tracking.
- **Cloudflare:** email/verification DNS records must be **DNS only**, never proxied.
- `bis_skin_checked` hydration warning = a browser extension (Bitdefender), not a bug;
  `<body suppressHydrationWarning>` silences it.

---

## 9. Local dev quick reference

```
# Site
cd "D:\Eggger\Niche Spy" && npm run dev        # http://localhost:3000

# Bot
cd "D:\Eggger\nichespy-bot" && npm run dev      # gateway + http on :8080
cd "D:\Eggger\nichespy-bot" && npm run register # (re)register slash commands
```
Both must run for the full local flow (signup → email → Discord notification).
