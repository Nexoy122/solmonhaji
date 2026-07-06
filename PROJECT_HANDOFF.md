# NicheSpy — Project Handoff & Context

> Read this first. It's the full picture of what NicheSpy is, what's built, how it works,
> and what's left. Give this file to a new Claude/dev and they'll have complete context.

Last updated: 2026-06-28 — **NicheSpy is LIVE in production.**

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
  tool — Cloudflare/Vercel handle DDoS at the network layer). **FAIL-OPEN**: if the widget
  can't produce/verify a token (misconfig, network, ad-blocker), the signup STILL proceeds —
  it only blocks when Turnstile explicitly rejects a real token. (After a 2026-06-27 outage
  where a missing hostname blocked ALL signups.) Turnstile is also **pre-warmed on page load**
  and the bot-check + dup-check run in PARALLEL for a faster join. The form also remembers a
  successful join in localStorage (`ns_joined`) so a refresh shows "you're already on the
  waitlist" instead of re-asking.

- **Referral modal** (`components/ReferralModal.tsx`): **PURE MARKETING ILLUSION — it's fake.**
  Triggers in Navbar ("Referral code" button) + Hero ("Have a referral code?" link). Opens a
  modal; **no code ever works** — always shows "Enter a valid referral code." Bottom link:
  "No code? Get one in our Discord server." Makes the waitlist feel exclusive/invite-driven.

- **Discord OAuth login** (`lib/discord.ts`, `app/api/discord/*`): "Login" button in the
  navbar → Discord OAuth (scopes identify + guilds.join) → adds the user to the server AND
  assigns role `1519631322363199558` (the "Verified" role), then lands on `/discord/done`.
  After login a **signed session cookie** stores their id/username/avatar (30 days) so the
  navbar shows their **avatar + name + a dropdown with Logout**. Routes: `/api/discord/login`,
  `/api/discord/callback`, `/api/discord/logout`, `/api/discord/me`. Needs DISCORD_* env vars
  on the site (client id/secret, bot token, guild, role, redirect URI) + redirect URIs added in
  the Developer Portal + the bot's role ABOVE the target role with Manage Roles.

- **Hero waitlist perks:** under the form, a callout box — "Join the waitlist & get exclusive
  early access at launch / Plus 1 week of premium tools free / 🔵 First 1,000 users only" badge.

- **Spots-remaining counter** (`components/SpotsRemaining.tsx`): replaced the fake avatar row.
  Reads the LIVE Firestore signup count → shows "Only N of 1,000 early-access spots left" with
  a pulsing dot (baseline floor of 247 so it never looks empty). Scarcity = conversions.

- **SEO:** `app/sitemap.ts` + `app/robots.ts` (auto-generated). Google Search Console verified
  (verification tag in `app/layout.tsx` metadata). OG/Twitter link-preview image at
  `public/og-image.png` (the NicheSpy banner) — 1366×768, declared in metadata. Meta
  descriptions mention the free Trust Score perk for waitlist members.

- **Legal:** `/privacy` and `/terms` pages (LegalLayout). Floating Discord button on all pages.

### Env vars (site — set in `.env` locally AND in Vercel for prod)
```
NEXT_PUBLIC_SITE_URL="https://waitlist.vixo.live"   (controls email logo, OG, canonical)
NEXT_PUBLIC_GA_ID="G-1DWN72Y5P0"
NEXT_PUBLIC_TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY → Cloudflare Turnstile
BOT_NOTIFY_URL="https://nichespy-bot-production.up.railway.app"
BOT_NOTIFY_SECRET             → must match bot's NOTIFY_SECRET
RESEND_API_KEY                → Resend
EMAIL_FROM="NicheSpy <support@vixo.live>"
# Discord OAuth login:
DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID,
DISCORD_JOIN_ROLE_ID="1519631322363199558", DISCORD_REDIRECT_URI=".../api/discord/callback"
```
Firebase client config is baked into `lib/firebase.ts` with defaults.

---

## 4. Discord bot (`D:\Eggger\nichespy-bot`)

**Stack:** Node + TypeScript · discord.js v14 · firebase-admin · express.
Runs **one process** = Discord gateway (slash commands, buttons, AI messages) + HTTP server
(`/notify`). **Deployed 24/7 on Railway.** Bot appears **invisible/offline** (by design;
`presence: invisible`) but works fully.

### Slash commands (HIDDEN from normal members; usable only by 3 allowlisted user IDs)
All commands use `setDefaultMemberPermissions(0n)` (hidden) AND the code checks
`config.allowedUserIds` before running (the 3 owner/admin IDs). Non-allowed users get "⛔ no access".
| Command | Does |
|---|---|
| `/stats` | Live waitlist stats: total, today, last 7 days, top traffic sources |
| `/listall` | All registered emails (embed, or .txt file if >25). Ephemeral |
| `/delete email:x` | Remove an email from the waitlist (case-insensitive) |
| `/genlink platform:x [campaign:y]` | Generate a UTM tracking link for any platform |
| `/status` | Status-page style health check: Website / Signup API / Database / Bot up-or-down |

### Signup notifications
Site `POST /notify` (secret-gated via `x-notify-secret`) → bot posts a "New waitlist signup"
embed to the signups channel (email, source, campaign, running total).

### Support ticket system (`src/tickets.ts`)
A panel (posted via `scripts/post-ticket-panel.js`) with a "Create Ticket" button → bot
creates a private `ticket-<userid>` channel under category `1519652087254880356`, visible to
the user (+ optional staff role). A "Close Ticket" button deletes it. Needs the bot to have
**Manage Channels**. Panel channel: `1519629334049198150`.

### AI assistant (`src/ai.ts` + `src/knowledge.ts`)
Auto-replies to messages in configured channel(s) (`AI_CHANNEL_IDS`). Uses **Groq** (free
tier, Llama 3.3 70B) — switched from Gemini because Gemini's free tier was region-locked
(quota 0). It's a **YouTube growth expert + NicheSpy assistant**: the knowledge base
(`knowledge.ts`) is a distilled playbook from 96 creator transcripts (retention >100%, hooks/
swipe ratio ~81%, view jail, niches, scaling) PLUS two PDF guides on running multiple channels
safely (terminations, Circumvention Policy, antidetect browsers + proxies, AdSense). NicheSpy
facts are fixed (won't hallucinate). Needs **Message Content intent** enabled in the Developer
Portal. Auto-reply answers EVERY message in the AI channel. Raw transcripts/PDFs are gitignored
(local only); only the distilled `knowledge.ts` ships.

### Posting server content (one-off scripts in `scripts/`)
`post-rules.js`, `post-faq.js`, `post-update.js`, `post-ticket-panel.js` — run with
`node scripts/<file>.js` (uses the bot token from `.env`) to post embeds/messages to specific
channels. Edit + re-run to update.

### Env vars (`.env`)
```
DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, SIGNUPS_CHANNEL_ID
NOTIFY_SECRET            → must match site's BOT_NOTIFY_SECRET
GOOGLE_APPLICATION_CREDENTIALS="./serviceAccount.json"  (local)
FIREBASE_SERVICE_ACCOUNT  → hosting: paste full JSON one-line instead of the file
FIRESTORE_COLLECTION="waitlist"
SITE_URL                → base for /genlink links (https://waitlist.vixo.live)
TICKET_CATEGORY_ID, TICKET_PANEL_CHANNEL_ID, TICKET_STAFF_ROLE_ID (optional)
ALLOWED_USER_IDS        → comma-separated; who can use slash commands
GROQ_API_KEY            → free key from console.groq.com (AI assistant)
AI_CHANNEL_IDS          → channel(s) where the AI auto-replies
```

### Deploy (Railway — current)
Auto-deploys on push to `main` (`github.com/Nexoy122/nichespy-bot`). Public URL
**https://nichespy-bot-production.up.railway.app**. Railway runs `npm run build` → `npm start`.
After adding/changing a slash command, run `npm run register` once locally. Set the site's
`BOT_NOTIFY_URL` to the Railway URL. (bot-hosting.net also works: zip dist/+package files,
startup `dist/index.js`.)

---

## 5. Infrastructure / accounts (all done)

- **Domain:** `vixo.live` — DNS on **Cloudflare** (nameservers huxley/ingrid.ns.cloudflare.com).
  Gives free DDoS + CDN. ⚠️ The two `firebase*._domainkey` CNAMEs and all MX/TXT email records
  must stay **"DNS only" (grey cloud)** in Cloudflare — proxying them breaks email/auth.
- **Email:** `vixo.live` **verified in Resend** (SPF + DKIM + MX + DMARC `p=none` all green).
  Sends from `support@vixo.live`, **confirmed landing in inbox (not spam)**.
- **Firebase:** project `waitlist-for-nichespy`, Firestore `waitlist` collection.
- **GA4:** property "NicheSpy", measurement ID `G-1DWN72Y5P0`, receiving live data. ✅
- **Turnstile:** Cloudflare widget, hostnames waitlist.vixo.live + vixo.live + localhost.
- **Discord:** bot app created + invited; 5 slash commands registered; OAuth redirect URIs set
  (localhost + waitlist.vixo.live callbacks); bot role is above the Verified role with Manage
  Roles + Manage Channels; Message Content intent enabled (for AI).
- **Groq:** free API key for the AI assistant (console.groq.com).
- **Primary live URL is `waitlist.vixo.live`** (root `vixo.live` also serves it). `NEXT_PUBLIC_SITE_URL`
  in Vercel = `https://waitlist.vixo.live`.

### Deployment (LIVE)
- **Site → Vercel.** Repo `github.com/Nexoy122/nichespy` (account: Nexoy122). Auto-deploys on
  push to `main`. Live at **https://waitlist.vixo.live** (and https://vixo.live — both serve it).
  Next.js pinned to **15.5.19** (Vercel blocks vulnerable 15.1.3). All 8 env vars set in Vercel.
- **Bot → Railway.** Repo `github.com/Nexoy122/nichespy-bot`. Auto-deploys on push to `main`.
  Public URL **https://nichespy-bot-production.up.railway.app**. Running 24/7. All env vars set
  (incl. `FIREBASE_SERVICE_ACCOUNT` as one-line JSON, `SITE_URL=https://waitlist.vixo.live`).
- **DNS (Cloudflare):** `waitlist` CNAME → Vercel; root `vixo.live` A → Vercel.

---

## 6. What's DONE ✅ (all live in production)

Site live on Vercel at waitlist.vixo.live · waitlist (Turnstile fail-open, dedup'd, fast,
remembers join) → Firestore · inbox-landing email from support@vixo.live · GA4 + cookie consent
· traffic attribution · live "spots remaining" scarcity counter · hero perk callout · Instagram
in footer · OG link-preview image · SEO (sitemap/robots/Search Console) · **Discord OAuth login**
(join server + Verified role + avatar/name/logout) · referral marketing modal · privacy/terms ·
Discord bot 24/7 on Railway: **5 slash commands (allowlisted), signup notifications, support
tickets, and an AI assistant** (YouTube growth expert + NicheSpy, trained on transcripts + PDFs).

## 7. What's LEFT 📋

1. **ROTATE SECRETS** — Discord bot token, Resend API key, Firebase service-account key were
   shared in chat during setup. Regenerate them before heavy public promotion. After rotating,
   update the values in Railway (bot) and Vercel (site) env vars.
2. **(Optional)** User wants a SEPARATE main site on root `vixo.live` (a different repo on their
   "beast322" GitHub). That means: detach `vixo.live` from the waitlist Vercel project →
   deploy the other repo as its own Vercel project → point root domain there. Waitlist stays on
   `waitlist.vixo.live`.
3. **(Optional)** Clean up test waitlist entries from setup (e.g. `/delete email:...` in Discord).

---

## 7b. HOW TO MAKE CHANGES / UPDATE THE SITE 🔧

**Both projects auto-deploy from GitHub.** The workflow for any change:

```
edit code locally → test on localhost → commit → git push → auto-deploys live (~2 min)
```

### Updating the WEBSITE (text, design, pages, email, features)
1. Edit files in `D:\Eggger\Niche Spy`
2. Preview locally: `cd "D:\Eggger\Niche Spy" && npm run dev` → http://localhost:3000
3. When happy: `git add -A && git commit -m "..." && git push`
4. **Vercel auto-builds & deploys** → live on waitlist.vixo.live in ~2 min.
   (Watch progress in the Vercel dashboard → Deployments.)

### Updating the DISCORD BOT (commands, notifications)
1. Edit files in `D:\Eggger\nichespy-bot`
2. If you changed/added a **slash command**, re-register it: `npm run register`
   (run once, locally, with the bot's `.env` — talks to Discord's API)
3. Commit + push → **Railway auto-builds & deploys** → live in ~2 min.

### Things to remember
- **Never commit secrets.** `.env` and `serviceAccount.json` are gitignored — keep it that way.
- **New secret/config?** Add it in the dashboard, NOT in code: Vercel (site) → Settings →
  Environment Variables, or Railway (bot) → Variables. Then redeploy (Vercel needs a redeploy
  after env changes; push a commit or use Deployments → Redeploy).
- **`NEXT_PUBLIC_*` vars** are baked into the browser build → changing them requires a redeploy.
- After pushing, if a Vercel build fails, check the build log (most likely a type/lint error or
  a Next.js security block — see gotchas).
- The safe habit: **always `npm run dev` and eyeball the change locally before pushing.**

## 8. Important gotchas (learned the hard way)

- **⚠️ Git commit author email MUST be `kingyt959@gmail.com`** (the Nexoy122 GitHub account's
  email). **Vercel BLOCKS deploys** whose commit author email doesn't match a GitHub account
  ("Deployment Blocked — commit email could not be matched"). Always run, in both repos,
  before committing: `git config user.email "kingyt959@gmail.com"` and
  `git config user.name "Nexoy122"`. This caused hours of "why won't it deploy" confusion.
- **⚠️ Turnstile hostnames** must include EVERY domain the site runs on (`waitlist.vixo.live`,
  `vixo.live`, `localhost`) in the Cloudflare Turnstile widget settings. Missing one made
  Turnstile refuse tokens → ALL signups blocked. (Now also fail-open as a safety net.)
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
